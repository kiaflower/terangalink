import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBoutiqueNotificationSettings } from '@/lib/push/notificationSettings'
import { detectNewlyAbandonedCarts } from '@/lib/analytics/detectAbandonedCarts'
import { computeWeeklyStats } from '@/lib/analytics/weeklyStats'
import { computeRecommendations } from '@/lib/analytics/recommendations'
import { sendPushToBoutique, sendPushToSuperAdmins } from '@/lib/push/sendPush'
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
 * par boutique. Un seul passage par jour et par boutique pour chaque type —
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

  const { data: boutiques } = await admin.from('boutiques').select('id, name, created_at, last_login_at').eq('is_active', true)

  let cartAbandonmentSent = 0
  let recommendationsSent = 0
  let adminAlertsSent = 0

  for (const boutique of boutiques ?? []) {
    try {
      const settings = await getBoutiqueNotificationSettings(admin, boutique.id)

      if (settings.cart_abandonment_enabled) {
        const { newlyAbandonedCount, scannedUntil } = await detectNewlyAbandonedCarts(
          admin, boutique.id, settings.cart_abandonment_delay_hours, settings.cart_abandonment_last_checked_at
        )
        if (newlyAbandonedCount > 0) {
          await sendPushToBoutique(admin, boutique.id, {
            type: 'cart_abandonment',
            title: newlyAbandonedCount > 1 ? `${newlyAbandonedCount} paniers abandonnés` : '1 panier abandonné',
            body: `${newlyAbandonedCount > 1 ? 'Des clients ont' : 'Un client a'} ajouté des produits au panier sans commander depuis plus de ${settings.cart_abandonment_delay_hours}h. Relancez-${newlyAbandonedCount > 1 ? 'les' : 'le'} !`,
            url: '/dashboard/boutique/analytics',
          })
          cartAbandonmentSent++
        }
        await admin.from('boutique_notification_settings')
          .upsert({ boutique_id: boutique.id, cart_abandonment_last_checked_at: scannedUntil.toISOString() }, { onConflict: 'boutique_id' })
      }

      if (settings.recommendations_enabled) {
        const alreadySentToday = settings.recommendations_last_sent_at && isSameUtcDay(settings.recommendations_last_sent_at, now)
        if (!alreadySentToday) {
          const periodEnd = now
          const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)
          const stats = await computeWeeklyStats(admin, boutique.id, periodStart, periodEnd)
          const recos = computeRecommendations(stats)
          if (recos.length > 0) {
            await sendPushToBoutique(admin, boutique.id, {
              type: 'recommendation',
              title: recos.length > 1 ? `${recos.length} recommandations pour votre boutique` : 'Une recommandation pour votre boutique',
              body: recos.map(r => `• ${r.message}`).join('\n'),
              url: '/dashboard/boutique/analytics',
            })
            recommendationsSent++
            await admin.from('boutique_notification_settings')
              .upsert({ boutique_id: boutique.id, recommendations_last_sent_at: now.toISOString() }, { onConflict: 'boutique_id' })
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
            .eq('boutique_id', boutique.id)
            .not('status', 'in', '(delivered,cancelled)')
            .lt('created_at', cutoff.toISOString())
          if ((pendingCount ?? 0) > 0) {
            await sendPushToBoutique(admin, boutique.id, {
              type: 'pending_orders',
              title: pendingCount === 1 ? '1 commande à mettre à jour' : `${pendingCount} commandes à mettre à jour`,
              body: `${pendingCount === 1 ? 'Une commande date' : 'Des commandes datent'} de plus de ${settings.pending_orders_delay_hours}h sans statut final — marquez-les "livrée" pour que vos revenus soient à jour.`,
              url: '/dashboard/boutique/orders',
            })
            await admin.from('boutique_notification_settings')
              .upsert({ boutique_id: boutique.id, pending_orders_last_sent_at: now.toISOString() }, { onConflict: 'boutique_id' })
          }
        }
      }

      // --- Alertes Super Admin (Phase 3) ---
      if (adminSettings.no_new_product_enabled || adminSettings.product_limit_enabled) {
        const { data: products } = await admin
          .from('products')
          .select('created_at')
          .eq('boutique_id', boutique.id)
          .order('created_at', { ascending: false })
        const productCount = products?.length ?? 0
        const latestProductAt = products?.[0]?.created_at ? new Date(products[0].created_at) : null
        const boutiqueAgeDays = daysSince(new Date(boutique.created_at), now)

        if (adminSettings.no_new_product_enabled) {
          if (productCount === 0 && boutiqueAgeDays >= adminSettings.no_product_ever_days) {
            if (await shouldSendAdminAlert(admin, 'admin_no_product_ever', boutique.id, adminSettings.no_new_product_days)) {
              await sendPushToSuperAdmins(admin, {
                type: 'admin_no_product_ever',
                title: 'Boutique sans aucun produit',
                body: `${boutique.name} n'a publié aucun produit depuis son inscription (${Math.floor(boutiqueAgeDays)}j).`,
                url: `/dashboard/super-admin/boutiques/${boutique.id}/edit`,
              })
              adminAlertsSent++
            }
          } else if (latestProductAt) {
            const daysSinceLastProduct = daysSince(latestProductAt, now)
            if (daysSinceLastProduct >= adminSettings.no_new_product_days &&
              await shouldSendAdminAlert(admin, 'admin_no_new_product', boutique.id, adminSettings.no_new_product_days)) {
              await sendPushToSuperAdmins(admin, {
                type: 'admin_no_new_product',
                title: 'Catalogue figé',
                body: `${boutique.name} n'a pas ajouté de nouveau produit depuis ${Math.floor(daysSinceLastProduct)}j.`,
                url: `/dashboard/super-admin/boutiques/${boutique.id}/edit`,
              })
              adminAlertsSent++
            }
          }
        }

        if (adminSettings.product_limit_enabled) {
          const { data: sub } = await admin.from('subscriptions').select('plan').eq('boutique_id', boutique.id).maybeSingle()
          const plan = (sub?.plan ?? 'free') as PlanKey
          const limit = getProductLimit(plan)
          if (limit !== -1 && productCount / limit * 100 >= adminSettings.product_limit_percent &&
            await shouldSendAdminAlert(admin, 'admin_product_limit', boutique.id, 14)) {
            await sendPushToSuperAdmins(admin, {
              type: 'admin_product_limit',
              title: 'Boutique proche de sa limite de plan',
              body: `${boutique.name} utilise ${productCount}/${limit} produits (${plan}) — bon moment pour proposer un upgrade.`,
              url: `/dashboard/super-admin/boutiques/${boutique.id}/edit`,
            })
            adminAlertsSent++
          }
        }
      }

      if (adminSettings.inactive_boutique_enabled) {
        const lastActivity = boutique.last_login_at ? new Date(boutique.last_login_at) : new Date(boutique.created_at)
        const daysSinceActivity = daysSince(lastActivity, now)
        if (daysSinceActivity >= adminSettings.inactive_boutique_days &&
          await shouldSendAdminAlert(admin, 'admin_inactive_boutique', boutique.id, adminSettings.inactive_boutique_days)) {
          await sendPushToSuperAdmins(admin, {
            type: 'admin_inactive_boutique',
            title: 'Boutique inactive',
            body: `${boutique.name} ne s'est pas connectée depuis ${Math.floor(daysSinceActivity)}j.`,
            url: `/dashboard/super-admin/boutiques/${boutique.id}/edit`,
          })
          adminAlertsSent++
        }
      }
    } catch (err) {
      console.error(`push-daily error for boutique ${boutique.id}:`, err)
    }
  }

  if (adminSettings.overdue_invoice_enabled) {
    const { data: overdueInvoices } = await admin
      .from('invoices')
      .select('boutique_id, final_amount, boutiques(name)')
      .eq('status', 'overdue')
    for (const invoice of (overdueInvoices ?? []) as unknown as Array<{ boutique_id: string; final_amount: number; boutiques: { name: string } | null }>) {
      try {
        if (await shouldSendAdminAlert(admin, 'admin_overdue_invoice', invoice.boutique_id, 3)) {
          await sendPushToSuperAdmins(admin, {
            type: 'admin_overdue_invoice',
            title: 'Facture impayée',
            body: `${invoice.boutiques?.name ?? 'Une boutique'} — facture de ${invoice.final_amount.toLocaleString('fr-FR')} FCFA en retard.`,
            url: '/dashboard/super-admin/invoices',
          })
          adminAlertsSent++
        }
      } catch (err) {
        console.error(`push-daily overdue invoice error for boutique ${invoice.boutique_id}:`, err)
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
    boutiquesProcessed: boutiques?.length ?? 0,
    cartAbandonmentSent,
    recommendationsSent,
    adminAlertsSent,
  })
}
