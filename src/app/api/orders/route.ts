import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'
import { getSiteUrl } from '@/lib/site-url'
import { sendPushToRestaurant } from '@/lib/push/sendPush'

export const dynamic = 'force-dynamic'

async function generateOrderNumber(
  restaurantId: string,
  admin: ReturnType<typeof createAdminClient>
): Promise<string> {
  const { data, error } = await admin
    .from('orders')
    .select('order_number')
    .eq('restaurant_id', restaurantId)
    .order('order_number', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error

  if (!data?.order_number) {
    return 'TL-000001'
  }

  const current = parseInt(data.order_number.replace('TL-', ''), 10)
  const next = String(current + 1).padStart(6, '0')

  return `TL-${next}`
}

async function resolveDiscount(
  admin: ReturnType<typeof createAdminClient>,
  restaurantId: string,
  promoCodeId: string | undefined,
  total: number
): Promise<{ promo_code_id: string | null; discount_amount: number }> {
  if (!promoCodeId) return { promo_code_id: null, discount_amount: 0 }

  // Les codes promo sont réservés au plan Pro — vérifié ici aussi (pas
  // seulement à la validation du code) car un client pourrait autrement
  // appeler /api/orders directement avec un promo_code_id périmé par un
  // downgrade Starter survenu entre la validation et l'envoi de la commande.
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('restaurant_id', restaurantId)
    .single()
  if (subscription?.plan !== 'pro') return { promo_code_id: null, discount_amount: 0 }

  const { data: promo } = await admin
    .from('promo_codes')
    .select('*')
    .eq('id', promoCodeId)
    .eq('restaurant_id', restaurantId)
    .single()

  if (!promo || !promo.is_active) return { promo_code_id: null, discount_amount: 0 }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) return { promo_code_id: null, discount_amount: 0 }
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) return { promo_code_id: null, discount_amount: 0 }
  if (total < promo.min_order_amount) return { promo_code_id: null, discount_amount: 0 }

  const discount = promo.discount_type === 'percent'
    ? Math.round((total * promo.discount_value) / 100)
    : Math.min(promo.discount_value, total)

  await admin.from('promo_codes').update({ uses_count: promo.uses_count + 1 }).eq('id', promo.id)

  return { promo_code_id: promo.id, discount_amount: discount }
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { restaurant_id, customer_name, customer_phone, customer_address, items, total, payment_method, notes, promo_code_id } = body

  if (!restaurant_id || !items || !total) {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data: restaurant } = await admin.from('restaurants').select('slug, is_active').eq('id', restaurant_id).single()
  if (!restaurant?.is_active) {
    return NextResponse.json({ error: 'Restaurant non disponible' }, { status: 400 })
  }

  const { promo_code_id: appliedPromoId, discount_amount } = await resolveDiscount(admin, restaurant_id, promo_code_id, total)

  const baseInsertData: Record<string, unknown> = {
    restaurant_id,
    customer_name,
    customer_phone,
    customer_address: customer_address || null,
    items,
    total: total - discount_amount,
    discount_amount,
    promo_code_id: appliedPromoId,
    payment_method: payment_method ?? 'Cash',
    notes: notes || null,
    status: 'pending',
  }

  // Checkout is a public, unauthenticated flow (customers never log in), so
  // this must bypass RLS rather than rely on the anon-scoped client.
  // order_number is generated per-restaurant and can collide under concurrent
  // requests (two customers checking out at the same time); retry with a
  // freshly-computed number on a unique-constraint violation.
  let data, error
  for (let attempt = 0; attempt < 3; attempt++) {
    const order_number = await generateOrderNumber(restaurant_id, admin)
    const result = await admin.from('orders').insert({ ...baseInsertData, order_number }).select().single()
    data = result.data
    error = result.error
    if (!error || error.code !== '23505') break
  }

  if (error) {
    console.error('orders insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Décrémente le stock des plats commandés (hors précommandes, qui portent
  // sur un stock futur et ne doivent pas toucher le stock disponible actuel).
  // decrement_menu_item_stock est un no-op si track_stock est désactivé pour
  // ce plat, donc aucune vérification préalable n'est nécessaire ici.
  for (const item of items as Array<{ product_id?: string; quantity?: number; isPreorder?: boolean; variants?: Record<string, string> }>) {
    if (!item.product_id || item.isPreorder) continue
    const quantity = Number(item.quantity)
    if (!Number.isFinite(quantity) || quantity <= 0) continue
    await admin.rpc('decrement_menu_item_stock', { p_menu_item_id: item.product_id, p_quantity: quantity })
    // Même logique côté option de variante — decrement_variant_option_stock
    // est un no-op si l'option choisie n'a pas de suivi de stock activé.
    for (const [variantName, option] of Object.entries(item.variants ?? {})) {
      await admin.rpc('decrement_variant_option_stock', {
        p_menu_item_id: item.product_id, p_variant_name: variantName, p_option: option, p_quantity: quantity,
      })
    }
  }

  // /c/[slug]/[order_number] is the unified link: it auto-redirects the
  // restaurant admin (when logged in) to their dashboard order view, and
  // shows the public tracking page to the customer otherwise.
  const dashboard_url = `${getSiteUrl()}/c/${restaurant.slug}/${data.order_number}`

  // Awaited (pas fire-and-forget) : une fonction serverless Vercel peut être
  // gelée juste après avoir envoyé la réponse, ce qui tuerait une promesse
  // encore en vol. Échec de push non bloquant pour le client final.
  try {
    const { data: settings } = await admin
      .from('restaurant_notification_settings')
      .select('new_order_enabled')
      .eq('restaurant_id', restaurant_id)
      .maybeSingle()

    if (settings?.new_order_enabled !== false) {
      await sendPushToRestaurant(admin, restaurant_id, {
        type: 'new_order',
        title: 'Nouvelle commande !',
        body: `${customer_name} — ${(total - discount_amount).toLocaleString('fr-FR')} FCFA`,
        url: '/dashboard/restaurant/orders',
      })
    }
  } catch (err) {
    console.error('new_order push error:', err)
  }

  return NextResponse.json({ ...data, slug: restaurant.slug, dashboard_url })
}
