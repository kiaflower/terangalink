'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { BarChart3, Eye, ShoppingBag, TrendingUp, Users, Loader2 } from 'lucide-react'
import { canUseFeature, normalizePlan } from '@/lib/plans'
import { FeatureGate } from '@/components/ui/FeatureGate'

interface TopItem { item_name: string; count: number }

export default function AnalyticsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [plan, setPlan] = useState('mensuel')

  const [viewsToday, setViewsToday] = useState(0)
  const [viewsYesterday, setViewsYesterday] = useState(0)
  const [viewsMonth, setViewsMonth] = useState(0)
  const [cartToday, setCartToday] = useState(0)
  const [cartMonth, setCartMonth] = useState(0)
  const [topItems, setTopItems] = useState<TopItem[]>([])

  const loadAnalytics = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.restaurant_id) { setLoading(false); return }
    const rid = profile.restaurant_id

    // Get plan
    const { data: sub } = await supabase
      .from('subscriptions').select('plan').eq('restaurant_id', rid).single()
    if (sub) setPlan(sub.plan)

    const now = new Date()
    const today = now.toISOString().split('T')[0]
    const yesterday = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: vToday }, { count: vYesterday }, { count: vMonth },
      { count: cToday }, { count: cMonth },
      { data: topData },
    ] = await Promise.all([
      supabase.from('analytics_events').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('event_type', 'page_view').gte('created_at', `${today}T00:00:00`),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('event_type', 'page_view')
        .gte('created_at', `${yesterday}T00:00:00`).lt('created_at', `${today}T00:00:00`),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('event_type', 'page_view').gte('created_at', monthStart),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('event_type', 'add_to_cart').gte('created_at', `${today}T00:00:00`),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('event_type', 'add_to_cart').gte('created_at', monthStart),
      supabase.from('analytics_events').select('item_name')
        .eq('restaurant_id', rid).eq('event_type', 'add_to_cart').not('item_name', 'is', null),
    ])

    setViewsToday(vToday ?? 0)
    setViewsYesterday(vYesterday ?? 0)
    setViewsMonth(vMonth ?? 0)
    setCartToday(cToday ?? 0)
    setCartMonth(cMonth ?? 0)

    // Aggregate top items
    if (topData) {
      const counts: Record<string, number> = {}
      topData.forEach((e: { item_name: string | null }) => {
        if (e.item_name) counts[e.item_name] = (counts[e.item_name] || 0) + 1
      })
      const sorted = Object.entries(counts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5)
        .map(([item_name, count]) => ({ item_name, count }))
      setTopItems(sorted)
    }

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadAnalytics() }, [loadAnalytics])

  const normalizedPlan = normalizePlan(plan)
  const hasAdvanced = canUseFeature(normalizedPlan, 'analyticsAvances')

  const viewTrend = viewsYesterday > 0
    ? Math.round(((viewsToday - viewsYesterday) / viewsYesterday) * 100)
    : viewsToday > 0 ? 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytiques</h1>
        <p className="text-gray-500 text-sm mt-1">Statistiques de votre site de commande</p>
      </div>

      {/* Base stats — available to all plans */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Vues aujourd'hui", value: viewsToday, icon: Eye, color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
          { label: 'Vues ce mois', value: viewsMonth, icon: BarChart3, color: 'text-blue-400', bg: 'bg-blue-400/10' },
          { label: 'Paniers aujourd\'hui', value: cartToday, icon: ShoppingBag, color: 'text-green-400', bg: 'bg-green-400/10' },
          { label: 'Paniers ce mois', value: cartMonth, icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-400/10' },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-50 border border-surface-200 rounded-2xl p-4">
            <div className={`w-9 h-9 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-gray-500 text-xs mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Advanced analytics — trimestriel+ */}
      <FeatureGate feature="analyticsAvances" hasAccess={hasAdvanced}>
        <div className="space-y-4">
          {/* Trend card */}
          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-brand-orange" />
              <h2 className="text-white font-semibold text-sm">Tendance</h2>
            </div>
            <div className="flex items-center gap-4">
              <div>
                <p className="text-3xl font-bold text-white">{viewsToday}</p>
                <p className="text-gray-500 text-xs">Vues aujourd&apos;hui</p>
              </div>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${viewTrend >= 0 ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {viewTrend >= 0 ? '↑' : '↓'} {Math.abs(viewTrend)}%
              </div>
              <div className="text-gray-600 text-xs">vs hier ({viewsYesterday} vues)</div>
            </div>
          </div>

          {/* Top items */}
          <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-4 h-4 text-brand-orange" />
              <h2 className="text-white font-semibold text-sm">Plats les plus ajoutés au panier</h2>
            </div>
            {topItems.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-6">
                Pas encore de données. Les stats apparaissent quand des clients visitent votre site.
              </p>
            ) : (
              <div className="space-y-3">
                {topItems.map((item, i) => {
                  const max = topItems[0]?.count || 1
                  const pct = Math.round((item.count / max) * 100)
                  return (
                    <div key={item.item_name} className="flex items-center gap-3">
                      <span className="text-gray-600 text-xs w-4 text-right">{i + 1}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-white text-sm truncate">{item.item_name}</p>
                          <p className="text-gray-400 text-xs ml-2 flex-shrink-0">{item.count} fois</p>
                        </div>
                        <div className="h-1.5 bg-surface-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full bg-brand-orange transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </FeatureGate>
    </div>
  )
}
