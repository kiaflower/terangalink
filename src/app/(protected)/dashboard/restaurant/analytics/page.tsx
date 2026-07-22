import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { computeWeeklyStats } from '@/lib/analytics/weeklyStats'
import { computeRecommendations } from '@/lib/analytics/recommendations'
import type { PlanKey } from '@/lib/plans'
import { FeatureGate } from '@/components/FeatureGate'

async function getRestaurantId(userId: string, supabase: ReturnType<typeof createClient>): Promise<string | null> {
  const cookieStore = cookies()
  const imp = cookieStore.get('sa_impersonate')?.value
  if (imp) return imp
  const { data } = await supabase.from('profiles').select('restaurant_id').eq('id', userId).single() as { data: { restaurant_id: string | null } | null }
  return data?.restaurant_id ?? null
}

const cardCls = 'bg-white border border-gray-200 rounded-2xl p-6'

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className={cardCls}>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
    </div>
  )
}

export default async function AnalyticsPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const restaurantId = await getRestaurantId(user.id, supabase)
  if (!restaurantId) return <div className="text-gray-500 py-20 text-center">Aucun restaurant associé</div>

  const { data: sub } = await supabase.from('subscriptions').select('plan').eq('restaurant_id', restaurantId).single()
  const plan: PlanKey = sub?.plan === 'pro' || sub?.plan === 'free' ? sub.plan : 'starter'

  const now = new Date()
  const d30Iso = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [views30Res, orders30Res] = await Promise.all([
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('event_type', 'restaurant_view').gte('created_at', d30Iso),
    supabase.from('orders').select('total, status').eq('restaurant_id', restaurantId).neq('status', 'cancelled').gte('created_at', d30Iso),
  ])
  const orders30 = (orders30Res.data ?? []) as Array<{ total: number; status: string }>
  const rev30 = orders30.reduce((s, o) => s + o.total, 0)

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Analytiques</h1>

      <SectionTitle title="Vue d'ensemble (30 jours)" />
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        <StatCard label="Visites" value={views30Res.count ?? 0} />
        <StatCard label="Commandes" value={orders30.length} />
        <StatCard label="Revenus estimés" value={`${new Intl.NumberFormat('fr-SN').format(rev30)} FCFA`} />
      </div>

      <FeatureGate plan={plan} feature="analyticsParcours" requiredPlanLabel="Starter"
        description="Débloquez le parcours d'achat (visites → commandes) et les plats les plus populaires.">
        <AdvancedAnalytics supabase={supabase} restaurantId={restaurantId} now={now} plan={plan} />
      </FeatureGate>
    </div>
  )
}

async function AdvancedAnalytics({ supabase, restaurantId, now, plan }: {
  supabase: ReturnType<typeof createClient>
  restaurantId: string
  now: Date
  plan: PlanKey
}) {
  const d7 = new Date(now.getTime() - 7 * 86400000)
  const d30Iso = new Date(now.getTime() - 30 * 86400000).toISOString()

  const [cartItemsRes, ordersItemsRes, weekStats] = await Promise.all([
    supabase.from('analytics_events').select('item_id, item_name').eq('restaurant_id', restaurantId).eq('event_type', 'add_to_cart').gte('created_at', d30Iso).limit(5000),
    supabase.from('orders').select('items').eq('restaurant_id', restaurantId).neq('status', 'cancelled').gte('created_at', d30Iso).limit(5000),
    computeWeeklyStats(supabase, restaurantId, d7, now),
  ])

  // Un seul tableau "plats populaires" (30j), fusionnant ajouts panier et
  // commandes par nom de plat plutôt que deux listes séparées.
  const productStats = new Map<string, { name: string; added: number; ordered: number }>()
  for (const e of cartItemsRes.data ?? []) {
    if (!e.item_name) continue
    const entry = productStats.get(e.item_name) ?? { name: e.item_name, added: 0, ordered: 0 }
    entry.added += 1
    productStats.set(e.item_name, entry)
  }
  for (const o of (ordersItemsRes.data ?? []) as Array<{ items: unknown }>) {
    const items = (o.items as Array<{ name: string; quantity: number }>) ?? []
    for (const item of items) {
      if (!item.name) continue
      const entry = productStats.get(item.name) ?? { name: item.name, added: 0, ordered: 0 }
      entry.ordered += item.quantity ?? 1
      productStats.set(item.name, entry)
    }
  }
  const popularProducts = Array.from(productStats.values())
    .sort((a, b) => (b.added + b.ordered) - (a.added + a.ordered))
    .slice(0, 6)

  const recommendations = computeRecommendations(weekStats)
  const pct = (n: number | null) => n === null ? '—' : `${Math.round(n * 100)}%`

  const journeySteps = [
    { label: 'Visites', value: weekStats.visits },
    { label: 'Vues plat', value: weekStats.productViews },
    { label: 'Ajouts panier', value: weekStats.addToCart },
    { label: 'Paniers créés', value: weekStats.cartsCreated },
    { label: 'Clics WhatsApp', value: weekStats.whatsappClicks },
    { label: 'Commandes confirmées', value: weekStats.ordersConfirmed },
  ]

  return (
    <>
      <SectionTitle title="Parcours d'achat (7 derniers jours)" subtitle="Le chemin suivi par vos visiteurs, du premier clic jusqu'à la commande." />
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-4">
        {journeySteps.map(s => <StatCard key={s.label} label={s.label} value={s.value} />)}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-sm">
        <div className="bg-gray-50 rounded-xl p-3">
          <span className="text-gray-500">Vue plat → panier : </span>
          <span className="font-semibold text-gray-900">{pct(weekStats.conversionRates.viewToCartRate)}</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <span className="text-gray-500">Panier → commande : </span>
          <span className="font-semibold text-gray-900">{pct(weekStats.conversionRates.cartToOrderRate)}</span>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <span className="text-gray-500">Conversion globale : </span>
          <span className="font-semibold text-gray-900">{pct(weekStats.conversionRates.overallConversionRate)}</span>
        </div>
      </div>

      {popularProducts.length > 0 && (
        <div className={`${cardCls} mb-10`}>
          <SectionTitle title="Plats populaires (30 jours)" />
          <div className="space-y-3">
            {popularProducts.map(p => (
              <div key={p.name} className="flex items-center justify-between text-sm">
                <span className="text-gray-700">{p.name}</span>
                <span className="text-brand-orange font-semibold">{p.added} ajout{p.added > 1 ? 's' : ''} · {p.ordered} commandé{p.ordered > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <FeatureGate plan={plan} feature="analyticsAvances" requiredPlanLabel="Pro"
        description="Débloquez l'abandon de panier, les plats à surveiller et des recommandations personnalisées.">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          <div className={cardCls}>
            <SectionTitle title="Paniers abandonnés" subtitle="Panier créé sans clic WhatsApp depuis plus de 48h, non vidé volontairement." />
            <p className="text-3xl font-bold text-gray-900">{weekStats.abandonedCarts}</p>
            <p className="text-sm text-gray-500 mt-1">sur {weekStats.cartsCreated} panier{weekStats.cartsCreated > 1 ? 's' : ''} créé{weekStats.cartsCreated > 1 ? 's' : ''} cette semaine</p>
          </div>

          {weekStats.highInterestLowConversion.length > 0 && (
            <div className={cardCls}>
              <SectionTitle title="Fort intérêt, faible conversion" subtitle="Beaucoup de vues, peu de commandes — à surveiller." />
              <div className="space-y-3">
                {weekStats.highInterestLowConversion.map(p => (
                  <div key={p.itemId} className="flex items-center justify-between text-sm">
                    <span className="text-gray-700">{p.itemName}</span>
                    <span className="text-gray-400">{p.views} vues · {p.ordersQty} commandé{p.ordersQty > 1 ? 's' : ''}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {recommendations.length > 0 && (
          <div>
            <SectionTitle title="Recommandations" />
            <div className="space-y-3">
              {recommendations.map(r => (
                <div key={r.type} className="bg-orange-50 border border-orange-100 rounded-2xl p-4 text-sm text-brand-orange font-medium">
                  {r.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </FeatureGate>
    </>
  )
}
