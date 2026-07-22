import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getRestaurantNotificationSettings } from '@/lib/push/notificationSettings'
import { detectNewlyAbandonedCarts } from '@/lib/analytics/detectAbandonedCarts'
import { computeWeeklyStats } from '@/lib/analytics/weeklyStats'
import { computeRecommendations } from '@/lib/analytics/recommendations'
import { sendPushToRestaurant, sendPushToSuperAdmins } from '@/lib/push/sendPush'
import { getAdminNotificationSettings } from '@/lib/push/adminNotificationSettings'
import { shouldSendAdminAlert } from '@/lib/push/adminAlertDedupe'
import { sendAdminPeriodicReminder } from '@/lib/push/adminPeriodicReminder'
import { getProductLimit, type PlanKey } from '@/lib/plans'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

function isSameUtcDay(a: string, b: Date): boolean {
  return new Date(a).toISOString().slice(0, 10) === b.toISOString().slice(0, 10)
}

function daysSince(date: Date, now: Date): number {
  return (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)
}

/**
 * Cron quotidien (voir vercel.json) : paniers abandonnés + recommandations
 * par restaurant. Un seul passage par jour et par restaurant pour chaque type —
 * c'est ce qui garantit qu'on ne spamme jamais plusieurs notifications de
 * recommandations le même jour, même si plusieurs règles se déclenchent.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const now = new Date()
  const adminSettings = await getAdminNotificationSettings(admin)

  const { data: restaurants } = await admin.from('restaurants').select('id, name, created_at, last_login_at').eq('is_active', true)

  let cartAbandonmentSent = 0
  let recommendationsSent = 0
  let adminAlertsSent = 0

  for (const restaurant of restaurants ?? []) {
    try {
      const settings = await getRestaurantNotificationSettings(admin, restaurant.id)

      if (settings.cart_abandonment_enabled) {
        const { newlyAbandonedCount, scannedUntil } = await detectNewlyAbandonedCarts(
          admin, restaurant.id, settings.cart_abandonment_delay_hours, settings.cart_abandonment_last_checked_at
        )
        if (newlyAbandonedCount > 0) {
          await sendPushToRestaurant(admin, restaurant.id, {
            type: 'cart_abandonment',
            title: newlyAbandonedCount > 1 ? `${newlyAbandonedCount} paniers abandonnés` : '1 panier abandonné',
            body: `${newlyAbandonedCount > 1 ? 'Des clients ont' : 'Un client a'} ajouté des plats au panier sans commander depuis plus de ${settings.cart_abandonment_delay_hours}h. Relancez-${newlyAbandonedCount > 1 ? 'les' : 'le'} !`,
            url: '/dashboard/restaurant/analytics',
          })
          cartAbandonmentSent++
        }
        await admin.from('restaurant_notification_settings')
          .upsert({ restaurant_id: restaurant.id, cart_abandonment_last_checked_at: scannedUntil.toISOString() }, { onConflict: 'restaurant_id' })
      }

      if (settings.recommendations_enabled) {
        const alreadySentToday = settings.recommendations_last_sent_at && isSameUtcDay(settings.recommendations_last_sent_at, now)
        if (!alreadySentToday) {
          const periodEnd = now
          const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
          const stats = await computeWeeklyStats(admin, restaurant.id, periodStart, periodEnd)
          const recos = computeRecommendations(stats)
          if (recos.length > 0) {
            await sendPushToRestaurant(admin, restaurant.id, {
              type: 'recommendation',
              title: recos.length > 1 ? `${recos.length} recommandations pour votre restaurant` : 'Une recommandation pour votre restaurant',
              body: recos.map(r => `• ${r.message}`).join('\n'),
              url: '/dashboard/restaurant/analytics',
            })
            recommendationsSent++
            await admin.from('restaurant_notification_settings')
              .upsert({ restaurant_id: restaurant.id, recommendations_last_sent_at: now.toISOString() }, { onConflict: 'restaurant_id' })
          }
        }
      }

      if (settings.pending_orders_enabled) {
        // Rappel récurrent (pas juste une fois) tant que des commandes
        // traînent : "Revenus ce mois" au dashboard ne compte que les
        // commandes 'delivered', donc en oublier fausse durablement le chiffre.
        const alreadyRemindedRecently = settings.pending_orders_last_sent_at &&
          daysSince(new Date(settings.pending_orders_last_sent_at), now) < 3
        if (!alreadyRemindedRecently) {
          const cutoff = new Date(now.getTime() - settings.pending_orders_delay_hours * 60 * 60 * 1000)
          const { count: pendingCount } = await admin
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .eq('restaurant_id', restaurant.id)
            .not('status', 'in', '(delivered,cancelled)')
            .lt('created_at', cutoff.toISOString())
          if ((pendingCount ?? 0) > 0) {
            await sendPushToRestaurant(admin, restaurant.id, {
              type: 'pending_orders',
              title: pendingCount === 1 ? '1 commande à mettre à jour' : `${pendingCount} commandes à mettre à jour`,
              body: `${pendingCount === 1 ? 'Une commande date' : 'Des commandes datent'} de plus de ${settings.pending_orders_delay_hours}h sans statut final — marquez-les "livrée" pour que vos revenus soient à jour.`,
              url: '/dashboard/restaurant/orders',
            })
            await admin.from('restaurant_notification_settings')
              .upsert({ restaurant_id: restaurant.id, pending_orders_last_sent_at: now.toISOString() }, { onConflict: 'restaurant_id' })
          }
        }
      }

      // --- Alertes Super Admin (Phase 3) ---
      if (adminSettings.no_new_product_enabled || adminSettings.product_limit_enabled) {
        const { data: products } = await admin
          .from('products')
          .select('created_at')
          .eq('restaurant_id', restaurant.id)
          .order('created_at', { ascending: false })
        const productCount = products?.length ?? 0
        const latestProductAt = products?.[0]?.created_at ? new Date(products[0].created_at) : null
        const restaurantAgeDays = daysSince(new Date(restaurant.created_at), now)

        if (adminSettings.no_new_product_enabled) {
          if (productCount === 0 && restaurantAgeDays >= adminSettings.no_product_ever_days) {
            if (await shouldSendAdminAlert(admin, 'admin_no_product_ever', restaurant.id, adminSettings.no_new_product_days)) {
              await sendPushToSuperAdmins(admin, {
                type: 'admin_no_product_ever',
                title: 'Restaurant sans aucun plat',
                body: `${restaurant.name} n'a publié aucun plat depuis son inscription (${Math.floor(restaurantAgeDays)}j).`,
                url: `/dashboard/super-admin/restaurants/${restaurant.id}/edit`,
              })
              adminAlertsSent++
            }
          } else if (latestProductAt) {
            const daysSinceLastProduct = daysSince(latestProductAt, now)
            if (daysSinceLastProduct >= adminSettings.no_new_product_days &&
              await shouldSendAdminAlert(admin, 'admin_no_new_product', restaurant.id, adminSettings.no_new_product_days)) {
              await sendPushToSuperAdmins(admin, {
                type: 'admin_no_new_product',
                title: 'Menu figé',
                body: `${restaurant.name} n'a pas ajouté de nouveau plat depuis ${Math.floor(daysSinceLastProduct)}j.`,
                url: `/dashboard/super-admin/restaurants/${restaurant.id}/edit`,
              })
              adminAlertsSent++
            }
          }
        }

        if (adminSettings.product_limit_enabled) {
          const { data: sub } = await admin.from('subscriptions').select('plan').eq('restaurant_id', restaurant.id).maybeSingle()
          const plan = (sub?.plan ?? 'free') as PlanKey
          const limit = getProductLimit(plan)
          if (limit !== -1 && productCount / limit * 100 >= adminSettings.product_limit_percent &&
            await shouldSendAdminAlert(admin, 'admin_product_limit', restaurant.id, 14)) {
            await sendPushToSuperAdmins(admin, {
              type: 'admin_product_limit',
              title: 'Restaurant proche de sa limite de plan',
              body: `${restaurant.name} utilise ${productCount}/${limit} plats (${plan}) — bon moment pour proposer un upgrade.`,
              url: `/dashboard/super-admin/restaurants/${restaurant.id}/edit`,
            })
            adminAlertsSent++
          }
        }
      }

      if (adminSettings.inactive_restaurant_enabled) {
        const lastActivity = restaurant.last_login_at ? new Date(restaurant.last_login_at) : new Date(restaurant.created_at)
        const daysSinceActivity = daysSince(lastActivity, now)
        if (daysSinceActivity >= adminSettings.inactive_restaurant_days &&
          await shouldSendAdminAlert(admin, 'admin_inactive_restaurant', restaurant.id, adminSettings.inactive_restaurant_days)) {
          await sendPushToSuperAdmins(admin, {
            type: 'admin_inactive_restaurant',
            title: 'Restaurant inactive',
            body: `${restaurant.name} ne s'est pas connectée depuis ${Math.floor(daysSinceActivity)}j.`,
            url: `/dashboard/super-admin/restaurants/${restaurant.id}/edit`,
          })
          adminAlertsSent++
        }
      }
    } catch (err) {
      console.error(`push-daily error for restaurant ${restaurant.id}:`, err)
    }
  }

  if (adminSettings.overdue_invoice_enabled) {
    const { data: overdueInvoices } = await admin
      .from('invoices')
      .select('restaurant_id, final_amount, restaurants(name)')
      .eq('status', 'overdue')
    for (const invoice of (overdueInvoices ?? []) as unknown as Array<{ restaurant_id: string; final_amount: number; restaurants: { name: string } | null }>) {
      try {
        if (await shouldSendAdminAlert(admin, 'admin_overdue_invoice', invoice.restaurant_id, 3)) {
          await sendPushToSuperAdmins(admin, {
            type: 'admin_overdue_invoice',
            title: 'Facture impayée',
            body: `${invoice.restaurants?.name ?? 'Un restaurant'} — facture de ${invoice.final_amount.toLocaleString('fr-FR')} FCFA en retard.`,
            url: '/dashboard/super-admin/invoices',
          })
          adminAlertsSent++
        }
      } catch (err) {
        console.error(`push-daily overdue invoice error for restaurant ${invoice.restaurant_id}:`, err)
      }
    }
  }

  if (adminSettings.periodic_reminder_enabled) {
    const dayOfWeek = now.getUTCDay()
    if (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 5) {
      try {
        await sendAdminPeriodicReminder(admin, now, dayOfWeek)
      } catch (err) {
        console.error('push-daily periodic reminder error:', err)
      }
    }
  }

  return NextResponse.json({
    success: true,
    restaurantsProcessed: restaurants?.length ?? 0,
    cartAbandonmentSent,
    recommendationsSent,
    adminAlertsSent,
  })
}
