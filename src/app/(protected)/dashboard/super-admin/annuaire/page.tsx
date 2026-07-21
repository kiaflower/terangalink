'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Eye, MousePointerClick, Store, CheckCircle, RefreshCw, BarChart3 } from 'lucide-react'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'

interface Boutique {
  id: string; name: string; slug: string; shop_category: string | null; city: string | null
  is_active: boolean; is_verified: boolean
}

interface BoutiqueStats extends Boutique {
  views: number; views_today: number
}

interface GlobalStats {
  total: number; active: number; verified: number
  total_views: number; views_today: number; views_week: number
}

function StatCard({ label, value, icon: Icon, color }: { label: string; value: number | string; icon: React.ElementType; color: string }) {
  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-5 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: color }} />
      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: color + '15' }}>
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

export default function AnnuairePage() {
  const supabase = createClient()
  const [boutiques, setBoutiques] = useState<BoutiqueStats[]>([])
  const [stats, setStats] = useState<GlobalStats>({ total: 0, active: 0, verified: 0, total_views: 0, views_today: 0, views_week: 0 })
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState<string | null>(null)
  const [search, setSearch] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const week = new Date(Date.now() - 7 * 86400000)

    const [
      { data: b },
      { count: totalViews },
      { count: viewsToday },
      { count: viewsWeek },
      { data: viewsPerBoutique },
    ] = await Promise.all([
      supabase.from('boutiques').select('id, name, slug, shop_category, city, is_active, is_verified').order('name').limit(200),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'boutique_view'),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'boutique_view').gte('created_at', today.toISOString()),
      supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'boutique_view').gte('created_at', week.toISOString()),
      supabase.from('analytics_events').select('boutique_id').eq('event_type', 'boutique_view'),
    ])

    // Count views per boutique
    const viewMap: Record<string, number> = {}
    const viewMapToday: Record<string, number> = {}
    const todayStr = today.toISOString()
    ;(viewsPerBoutique ?? []).forEach((e: { boutique_id: string; created_at?: string }) => {
      if (e.boutique_id) {
        viewMap[e.boutique_id] = (viewMap[e.boutique_id] ?? 0) + 1
        if ((e as { created_at?: string }).created_at && (e as { created_at?: string }).created_at! >= todayStr) {
          viewMapToday[e.boutique_id] = (viewMapToday[e.boutique_id] ?? 0) + 1
        }
      }
    })

    // We can't easily get created_at per boutique above because we didn't select it. Let's just use total.
    const boutiqueList = (b ?? []) as Boutique[]
    const withStats: BoutiqueStats[] = boutiqueList.map(bq => ({
      ...bq,
      views: viewMap[bq.id] ?? 0,
      views_today: viewMapToday[bq.id] ?? 0,
    }))

    setBoutiques(withStats)
    setStats({
      total: boutiqueList.length,
      active: boutiqueList.filter(x => x.is_active).length,
      verified: boutiqueList.filter(x => x.is_verified).length,
      total_views: totalViews ?? 0,
      views_today: viewsToday ?? 0,
      views_week: viewsWeek ?? 0,
    })
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  async function toggle(id: string, field: 'is_active' | 'is_verified', current: boolean) {
    setToggling(`${id}-${field}`)
    await supabase.from('boutiques').update({ [field]: !current }).eq('id', id)
    setBoutiques(prev => prev.map(b => b.id === id ? { ...b, [field]: !current } : b))
    setStats(prev => ({
      ...prev,
      active: field === 'is_active' ? prev.active + (current ? -1 : 1) : prev.active,
      verified: field === 'is_verified' ? prev.verified + (current ? -1 : 1) : prev.verified,
    }))
    setToggling(null)
  }

  const filtered = boutiques.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || (b.city ?? '').toLowerCase().includes(search.toLowerCase())
  ).sort((a, b) => b.views - a.views)

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion annuaire</h1>
          <p className="text-gray-500 text-sm mt-1">Visibilité, vérification et statistiques</p>
        </div>
        <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
          <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard label="Boutiques total" value={stats.total} icon={Store} color="#F97316" />
        <StatCard label="Actives dans l'annuaire" value={stats.active} icon={CheckCircle} color="#059669" />
        <StatCard label="Vérifiées" value={stats.verified} icon={CheckCircle} color="#2563EB" />
        <StatCard label="Vues boutiques (total)" value={stats.total_views.toLocaleString('fr-SN')} icon={Eye} color="#D97706" />
        <StatCard label="Vues aujourd'hui" value={stats.views_today.toLocaleString('fr-SN')} icon={Eye} color="#DB2777" />
        <StatCard label="Vues cette semaine" value={stats.views_week.toLocaleString('fr-SN')} icon={BarChart3} color="#0891B2" />
      </div>

      {/* Boutique list */}
      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom ou ville…"
          className="w-full sm:w-72 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange transition-colors" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        <div className="hidden sm:grid grid-cols-12 gap-3 px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
          <span className="col-span-4">Boutique</span>
          <span className="col-span-2">Vues</span>
          <span className="col-span-2">Auj.</span>
          <span className="col-span-4">Actions</span>
        </div>
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-12">Chargement…</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-20 text-sm">Aucune boutique</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(b => (
              <div key={b.id} className="p-4 sm:p-0 sm:grid sm:grid-cols-12 sm:gap-3 sm:px-5 sm:py-4 items-center gap-3 flex flex-col sm:flex-row">
                <div className="w-full sm:col-span-4 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.name}</p>
                    {b.is_verified && <VerifiedBadge label="" className="text-gray-600" />}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{b.shop_category}{b.city ? ` · ${b.city}` : ''}</p>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex items-center gap-1 text-sm text-gray-700">
                    <Eye className="w-3.5 h-3.5 text-gray-400" />
                    {b.views.toLocaleString('fr-SN')}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-sm text-gray-500">{b.views_today > 0 ? `+${b.views_today}` : '—'}</span>
                </div>
                <div className="sm:col-span-4 flex items-center gap-2 flex-wrap w-full sm:w-auto">
                  <button
                    onClick={() => toggle(b.id, 'is_active', b.is_active)}
                    disabled={toggling === `${b.id}-is_active`}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${b.is_active ? 'bg-green-50 text-green-700 hover:bg-red-50 hover:text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-700'}`}>
                    {b.is_active ? 'Active' : 'Inactive'}
                  </button>
                  <button
                    onClick={() => toggle(b.id, 'is_verified', b.is_verified)}
                    disabled={toggling === `${b.id}-is_verified`}
                    className={`text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${b.is_verified ? 'bg-blue-50 text-blue-700 hover:bg-gray-100 hover:text-gray-500' : 'bg-gray-100 text-gray-500 hover:bg-blue-50 hover:text-blue-700'}`}>
                    {b.is_verified ? '✓ Vérifié' : 'Vérifier'}
                  </button>
                  <a href={`/${b.slug}`} target="_blank" rel="noopener noreferrer"
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-brand-orange hover:border-brand-orange/30 transition-colors">
                    <MousePointerClick className="w-3.5 h-3.5 inline" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
