import type { createAdminClient } from '@/lib/supabase/admin'
import { ANALYTICS_THRESHOLDS } from './thresholds'

type AdminClient = ReturnType<typeof createAdminClient>

export interface ProductInterestStat {
  itemId: string
  itemName: string
  views: number
  addToCart: number
  ordersQty: number
}

export interface WeeklyStats {
  periodStart: string
  periodEnd: string
  visits: number
  productViews: number
  addToCart: number
  cartsCreated: number
  whatsappClicks: number
  ordersConfirmed: number
  ordersTotal: number
  abandonedCarts: number
  visitGrowthPercent: number | null
  topProduct: { itemId: string; itemName: string; views: number } | null
  conversionRates: {
    viewToCartRate: number | null
    cartToOrderRate: number | null
    overallConversionRate: number | null
  }
  highInterestLowConversion: ProductInterestStat[]
}

function distinctSessionCount(rows: { session_id: string | null }[]): number {
  const ids = new Set(rows.filter(r => r.session_id).map(r => r.session_id as string))
  return ids.size || rows.length // fallback : anciennes lignes sans session_id, on compte les événements bruts
}

/**
 * Calcule les métriques du parcours d'achat (visites -> vues plat ->
 * ajouts panier -> paniers créés -> clics WhatsApp -> commandes confirmées)
 * et l'abandon de panier pour un restaurant sur une période donnée. Module
 * unique consommé par le dashboard restaurant (analytics/page.tsx) et le
 * générateur de rapport hebdomadaire (super admin) — une seule implémentation.
 */
export async function computeWeeklyStats(
  admin: AdminClient,
  restaurantId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<WeeklyStats> {
  const startIso = periodStart.toISOString()
  const endIso = periodEnd.toISOString()
  const periodLengthMs = periodEnd.getTime() - periodStart.getTime()
  const prevStartIso = new Date(periodStart.getTime() - periodLengthMs).toISOString()
  const abandonCutoff = new Date(Date.now() - ANALYTICS_THRESHOLDS.cartAbandonmentHours * 60 * 60 * 1000)

  const [
    visitsRes,
    prevVisitsRes,
    productViewsRes,
    addToCartRes,
    ordersRes,
  ] = await Promise.all([
    admin.from('analytics_events').select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId).eq('event_type', 'restaurant_view').gte('created_at', startIso).lt('created_at', endIso),
    admin.from('analytics_events').select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId).eq('event_type', 'restaurant_view').gte('created_at', prevStartIso).lt('created_at', startIso),
    admin.from('analytics_events').select('item_id, item_name')
      .eq('restaurant_id', restaurantId).eq('event_type', 'product_view').gte('created_at', startIso).lt('created_at', endIso).limit(10000),
    admin.from('analytics_events').select('item_id, item_name, session_id, created_at')
      .eq('restaurant_id', restaurantId).eq('event_type', 'add_to_cart').gte('created_at', startIso).lt('created_at', endIso).limit(10000),
    admin.from('orders').select('status, items')
      .eq('restaurant_id', restaurantId).gte('created_at', startIso).lt('created_at', endIso).limit(10000),
  ])

  const visits = visitsRes.count ?? 0
  const prevVisits = prevVisitsRes.count ?? 0
  const visitGrowthPercent = prevVisits > 0 ? Math.round(((visits - prevVisits) / prevVisits) * 100) : null

  const productViewRows = productViewsRes.data ?? []
  const addToCartRows = (addToCartRes.data ?? []) as Array<{ item_id: string | null; item_name: string | null; session_id: string | null; created_at: string }>
  const orders = (ordersRes.data ?? []) as Array<{ status: string; items: unknown }>

  const productViews = productViewRows.length
  const addToCart = addToCartRows.length
  const cartsCreated = distinctSessionCount(addToCartRows)
  const ordersTotal = orders.length
  const ordersConfirmed = orders.filter(o => o.status !== 'pending' && o.status !== 'cancelled').length

  // Un panier n'existe que côté client (add_to_cart) — les clics WhatsApp
  // sont mesurés séparément (voir tracking dans RestaurantPageClient /
  // ProductOrderPanel) pour ne pas confondre "panier créé" et "commande".
  const whatsappClicksRes = await admin.from('analytics_events').select('session_id')
    .eq('restaurant_id', restaurantId).eq('event_type', 'whatsapp_click').gte('created_at', startIso).lt('created_at', endIso).limit(10000)
  const whatsappClickRows = (whatsappClicksRes.data ?? []) as Array<{ session_id: string | null }>
  const whatsappClicks = distinctSessionCount(whatsappClickRows)

  // Abandon de panier : sessions ayant ajouté au panier mais n'ayant jamais
  // cliqué WhatsApp, dont le dernier ajout date de plus de `cartAbandonmentHours`,
  // et qui n'ont pas volontairement vidé leur panier après ce dernier ajout.
  const sessionIds = Array.from(new Set(addToCartRows.filter(r => r.session_id).map(r => r.session_id as string)))
  let abandonedCarts = 0
  if (sessionIds.length > 0) {
    const [convertedRes, clearedRes] = await Promise.all([
      admin.from('analytics_events').select('session_id')
        .eq('restaurant_id', restaurantId).eq('event_type', 'whatsapp_click').in('session_id', sessionIds).limit(10000),
      admin.from('analytics_events').select('session_id, created_at')
        .eq('restaurant_id', restaurantId).eq('event_type', 'cart_cleared').in('session_id', sessionIds).limit(10000),
    ])
    const convertedSessions = new Set((convertedRes.data ?? []).map((r: { session_id: string }) => r.session_id))
    const lastClearedAt = new Map<string, number>()
    for (const row of (clearedRes.data ?? []) as Array<{ session_id: string; created_at: string }>) {
      const t = new Date(row.created_at).getTime()
      const existing = lastClearedAt.get(row.session_id)
      if (!existing || t > existing) lastClearedAt.set(row.session_id, t)
    }
    const lastAddedAt = new Map<string, number>()
    for (const row of addToCartRows) {
      if (!row.session_id) continue
      const t = new Date(row.created_at).getTime()
      const existing = lastAddedAt.get(row.session_id)
      if (!existing || t > existing) lastAddedAt.set(row.session_id, t)
    }
    for (const sid of sessionIds) {
      if (convertedSessions.has(sid)) continue
      const lastAdd = lastAddedAt.get(sid) ?? 0
      if (lastAdd > abandonCutoff.getTime()) continue // trop récent, pas encore "abandonné"
      const clearedAfter = lastClearedAt.get(sid)
      if (clearedAfter && clearedAfter > lastAdd) continue // panier volontairement vidé
      abandonedCarts++
    }
  }

  // Intérêt par plat (vues + ajouts panier + quantité commandée) pour le
  // "plat le plus populaire" et les plats à fort intérêt / faible conversion.
  const interest = new Map<string, ProductInterestStat>()
  const bump = (id: string | null, name: string | null, field: 'views' | 'addToCart' | 'ordersQty', qty = 1) => {
    if (!id) return
    const entry = interest.get(id) ?? { itemId: id, itemName: name ?? 'Plat', views: 0, addToCart: 0, ordersQty: 0 }
    entry[field] += qty
    if (name) entry.itemName = name
    interest.set(id, entry)
  }
  for (const r of productViewRows) bump(r.item_id, r.item_name, 'views')
  for (const r of addToCartRows) bump(r.item_id, r.item_name, 'addToCart')
  for (const o of orders) {
    if (o.status === 'cancelled') continue
    const items = (o.items as Array<{ product_id?: string; name: string; quantity: number }>) ?? []
    for (const item of items) bump(item.product_id ?? null, item.name, 'ordersQty', item.quantity ?? 1)
  }

  const topProduct = Array.from(interest.values()).sort((a, b) => b.views - a.views)[0]

  const highInterestLowConversion = Array.from(interest.values())
    .filter(p => p.views >= ANALYTICS_THRESHOLDS.minViewsForSignal && p.ordersQty / p.views < ANALYTICS_THRESHOLDS.lowOrderConversionRate)
    .sort((a, b) => b.views - a.views)
    .slice(0, 5)

  return {
    periodStart: periodStart.toISOString().slice(0, 10),
    periodEnd: periodEnd.toISOString().slice(0, 10),
    visits,
    productViews,
    addToCart,
    cartsCreated,
    whatsappClicks,
    ordersConfirmed,
    ordersTotal,
    abandonedCarts,
    visitGrowthPercent,
    topProduct: topProduct ? { itemId: topProduct.itemId, itemName: topProduct.itemName, views: topProduct.views } : null,
    conversionRates: {
      viewToCartRate: productViews > 0 ? addToCart / productViews : null,
      cartToOrderRate: cartsCreated > 0 ? ordersConfirmed / cartsCreated : null,
      overallConversionRate: visits > 0 ? ordersConfirmed / visits : null,
    },
    highInterestLowConversion,
  }
}
