'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, MousePointerClick, Zap, Star, Loader2, TrendingUp } from 'lucide-react'
import { formatDate } from '@/lib/utils'

interface RestaurantRow {
  id: string
  name: string
  slug: string
  city: string | null
  is_active: boolean
  is_boosted: boolean
  rating: number | null
  review_count: number
  click_count: number
}

export default function AnnuairePage() {
  const supabase = createClient()

  const [restaurants, setRestaurants] = useState<RestaurantRow[]>([])
  const [stats, setStats] = useState({ views: 0, clicks: 0, boosted: 0, avgRating: 0 })
  const [loading, setLoading] = useState(true)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const [
      { data: restos },
      { data: reviews },
      { data: clicks },
      { data: views },
    ] = await Promise.all([
      supabase.from('restaurants').select('id, name, slug, city, is_active, is_boosted').order('name'),
      supabase.from('reviews').select('restaurant_id, rating').eq('is_visible', true),
      supabase.from('analytics_events').select('restaurant_id').eq('event_type', 'directory_click').gte('created_at', since30d),
      supabase.from('analytics_events').select('id').eq('event_type', 'directory_view').gte('created_at', since30d),
    ])

    // Agréger les avis par restaurant
    const ratingMap: Record<string, { sum: number; count: number }> = {}
    for (const r of reviews ?? []) {
      if (!ratingMap[r.restaurant_id]) ratingMap[r.restaurant_id] = { sum: 0, count: 0 }
      ratingMap[r.restaurant_id].sum += r.rating
      ratingMap[r.restaurant_id].count++
    }

    // Agréger les clics par restaurant
    const clickMap: Record<string, number> = {}
    for (const c of clicks ?? []) {
      if (c.restaurant_id) clickMap[c.restaurant_id] = (clickMap[c.restaurant_id] ?? 0) + 1
    }

    const rows: RestaurantRow[] = (restos ?? []).map(r => {
      const rm = ratingMap[r.id]
      return {
        ...r,
        rating: rm ? Math.round((rm.sum / rm.count) * 10) / 10 : null,
        review_count: rm?.count ?? 0,
        click_count: clickMap[r.id] ?? 0,
      }
    }).sort((a, b) => {
      if (a.is_boosted && !b.is_boosted) return -1
      if (!a.is_boosted && b.is_boosted) return 1
      return b.click_count - a.click_count
    })

    setRestaurants(rows)

    // Stats globales
    const allRatings = reviews?.map(r => r.rating) ?? []
    const avgRating = allRatings.length ? allRatings.reduce((a, b) => a + b, 0) / allRatings.length : 0
    setStats({
      views: views?.length ?? 0,
      clicks: clicks?.length ?? 0,
      boosted: rows.filter(r => r.is_boosted).length,
      avgRating: Math.round(avgRating * 10) / 10,
    })

    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function toggleBoost(r: RestaurantRow) {
    setTogglingId(r.id)
    await fetch('/api/super-admin/boost', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: r.id, is_boosted: !r.is_boosted }),
    })
    setRestaurants(prev => prev.map(x =>
      x.id === r.id ? { ...x, is_boosted: !x.is_boosted } : x
    ).sort((a, b) => {
      if (a.is_boosted && !b.is_boosted) return -1
      if (!a.is_boosted && b.is_boosted) return 1
      return b.click_count - a.click_count
    }))
    setStats(s => ({ ...s, boosted: s.boosted + (r.is_boosted ? -1 : 1) }))
    setTogglingId(null)
  }

  const STAT_CARDS = [
    { label: 'Vues annuaire (30j)', value: stats.views.toLocaleString(), icon: Eye, color: '#F97316', sub: 'Visites de /restaurants' },
    { label: 'Clics restaurants (30j)', value: stats.clicks.toLocaleString(), icon: MousePointerClick, color: '#22C55E', sub: 'Depuis l\'annuaire' },
    { label: 'Restaurants boostés', value: stats.boosted, icon: Zap, color: '#F59E0B', sub: 'Mis en avant' },
    { label: 'Note moyenne', value: stats.avgRating > 0 ? stats.avgRating.toFixed(1) : '—', icon: Star, color: '#8B5CF6', sub: 'Tous les avis visibles' },
  ]

  return (
    <div className="p-6 sm:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Annuaire</h1>
        <p className="text-gray-500 text-sm mt-1">Performance de l&apos;annuaire public et gestion du boost</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {STAT_CARDS.map(({ label, value, icon: Icon, color, sub }) => (
          <div key={label} className="rounded-2xl p-5 flex flex-col gap-3"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-gray-500">{label}</p>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${color}15` }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{loading ? '…' : value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Liste restaurants */}
      <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <h2 className="font-semibold text-gray-900">
            Restaurants ({restaurants.length})
          </h2>
          <span className="text-xs text-gray-400">Triés par clics · 30 derniers jours</span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
          </div>
        ) : restaurants.length === 0 ? (
          <p className="text-center py-16 text-gray-400 text-sm">Aucun restaurant</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {restaurants.map(r => (
              <div key={r.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                {/* Avatar */}
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
                  style={{ backgroundColor: r.is_boosted ? '#F97316' : '#E5E7EB', color: r.is_boosted ? '#fff' : '#9CA3AF' }}>
                  {r.name.charAt(0)}
                </div>

                {/* Nom + ville */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-sm text-gray-900 truncate">{r.name}</p>
                    {r.is_boosted && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold"
                        style={{ backgroundColor: '#FFF7ED', color: '#EA580C', border: '1px solid #FED7AA' }}>
                        <Zap className="w-3 h-3 fill-orange-500" />Boosté
                      </span>
                    )}
                    {!r.is_active && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
                        Hors ligne
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{r.city ?? 'Sénégal'} · /{r.slug}</p>
                </div>

                {/* Note */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 w-20">
                  {r.rating ? (
                    <>
                      <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                      <span className="text-sm font-semibold text-gray-900">{r.rating.toFixed(1)}</span>
                      <span className="text-xs text-gray-400">({r.review_count})</span>
                    </>
                  ) : (
                    <span className="text-xs text-gray-300">Pas d&apos;avis</span>
                  )}
                </div>

                {/* Clics 30j */}
                <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0 w-24 justify-end">
                  <TrendingUp className="w-3.5 h-3.5 text-gray-300" />
                  <span className="text-sm font-semibold text-gray-900">{r.click_count}</span>
                  <span className="text-xs text-gray-400">clics</span>
                </div>

                {/* Toggle boost */}
                <button
                  onClick={() => toggleBoost(r)}
                  disabled={togglingId === r.id}
                  className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                  style={r.is_boosted ? {
                    backgroundColor: '#FFF7ED',
                    color: '#EA580C',
                    border: '1px solid #FED7AA',
                  } : {
                    backgroundColor: '#F9FAFB',
                    color: '#6B7280',
                    border: '1px solid #E5E7EB',
                  }}
                >
                  {togglingId === r.id
                    ? <Loader2 className="w-3 h-3 animate-spin" />
                    : <Zap className={`w-3 h-3 ${r.is_boosted ? 'fill-orange-500 text-orange-500' : ''}`} />
                  }
                  {r.is_boosted ? 'Retirer le boost' : 'Booster'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
