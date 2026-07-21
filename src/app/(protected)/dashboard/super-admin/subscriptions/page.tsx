'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { PLANS } from '@/lib/plans'
import { RefreshCw, TrendingUp, Clock, XCircle, DollarSign } from 'lucide-react'
import { SubscriptionRow } from './SubscriptionRow'

// Prix figé pour les boutiques badge fondateur — indépendant du prix Pro
// courant réglable en paramètres super-admin (grandfathering).
const FOUNDER_PRO_PRICE = 7900

interface Sub {
  id: string
  plan: string
  status: string
  started_at: string
  ends_at: string | null
  discount_percent: number | null
  discount_expires_at: string | null
  pending_discount_percent: number | null
  boutique: { name: string; slug: string; is_demo: boolean; is_founder: boolean } | null
}

export default function SubscriptionsPage() {
  const supabase = createClient()
  const [subs, setSubs] = useState<Sub[]>([])
  const [loading, setLoading] = useState(true)
  // null jusqu'au premier fetch côté client : évite un mismatch d'hydratation
  // (new Date() rendu côté serveur diffère forcément de celui du client).
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [filter, setFilter] = useState<string>('all')
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({ starter: PLANS.starter.price, pro: PLANS.pro.price })

  useEffect(() => {
    fetch('/api/platform-settings')
      .then(r => r.json())
      .then(d => setPlanPrices({ starter: d.plan_starter_price ?? PLANS.starter.price, pro: d.plan_pro_price ?? PLANS.pro.price }))
      .catch(() => {})
  }, [])

  const fetchSubs = useCallback(async () => {
    const { data } = await supabase
      .from('subscriptions')
      .select('id, plan, status, started_at, ends_at, discount_percent, discount_expires_at, pending_discount_percent, boutique:boutiques(name, slug, is_demo, is_founder)')
      .order('created_at', { ascending: false })
      .limit(200)
    setSubs((data ?? []) as unknown as Sub[])
    setLastRefresh(new Date())
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchSubs()
    const interval = setInterval(fetchSubs, 60000)
    const channel = supabase
      .channel('subscriptions-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, fetchSubs)
      .subscribe()
    return () => { clearInterval(interval); supabase.removeChannel(channel) }
  }, [fetchSubs])

  // Les boutiques de démo (vitrines de présentation, pas de vrais clients) ne
  // doivent jamais gonfler les statistiques de cette page.
  const billableSubs = subs.filter(s => !s.boutique?.is_demo)

  const activeCount = billableSubs.filter(s => s.status === 'active').length
  const trialCount = billableSubs.filter(s => s.status === 'trial').length
  const expiredCount = billableSubs.filter(s => s.status === 'suspended' || s.status === 'cancelled' || s.status === 'overdue').length
  const expiringSoon = billableSubs.filter(s => s.ends_at && new Date(s.ends_at).getTime() - Date.now() < 7 * 86400000 && new Date(s.ends_at).getTime() > Date.now()).length
  const estimatedRevenue = billableSubs
    .filter(s => s.status === 'active')
    .reduce((sum, s) => {
      if (s.plan !== 'pro') return sum + planPrices.starter
      return sum + (s.boutique?.is_founder ? FOUNDER_PRO_PRICE : planPrices.pro)
    }, 0)

  const statCards = [
    { label: 'Actifs', value: activeCount, icon: TrendingUp, color: '#059669', bg: '#F0FDF4', filter: 'active' },
    { label: 'En essai', value: trialCount, icon: Clock, color: '#7C3AED', bg: '#F5F3FF', filter: 'trial' },
    { label: 'Expirés / suspendus', value: expiredCount, icon: XCircle, color: '#DC2626', bg: '#FEF2F2', filter: 'expired' },
    { label: 'Revenus / mois', value: `${new Intl.NumberFormat('fr-SN').format(estimatedRevenue)} FCFA`, icon: DollarSign, color: '#D97706', bg: '#FFFBEB', filter: 'all' },
  ]

  const filtered = subs.filter(s => {
    if (filter === 'all') return true
    if (filter === 'active') return s.status === 'active'
    if (filter === 'trial') return s.status === 'trial'
    if (filter === 'expired') return s.status === 'suspended' || s.status === 'cancelled' || s.status === 'overdue'
    return true
  })

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Abonnements</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {subs.length} abonnement{subs.length !== 1 ? 's' : ''} · en temps réel
            {expiringSoon > 0 && (
              <span className="ml-2 text-orange-600 font-medium">⚠ {expiringSoon} expire{expiringSoon > 1 ? 'nt' : ''} dans 7 jours</span>
            )}
          </p>
        </div>
        <button onClick={fetchSubs}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-violet border border-gray-200 rounded-lg px-3 py-2 transition-colors shrink-0">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">{lastRefresh ? lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}</span>
        </button>
      </div>

      {/* Live indicator */}
      <div className="inline-flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Données en direct
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(s => (
          <button key={s.label} onClick={() => setFilter(f => f === s.filter ? 'all' : s.filter)}
            className="rounded-2xl p-5 border text-left transition-all hover:shadow-sm"
            style={{
              backgroundColor: s.bg,
              borderColor: filter === s.filter ? s.color : '#F3F4F6',
              boxShadow: filter === s.filter ? `0 0 0 2px ${s.color}33` : undefined,
            }}>
            <div className="flex items-center justify-between mb-2">
              <s.icon className="w-4 h-4" style={{ color: s.color }} />
              {filter === s.filter && s.filter !== 'all' && <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: s.color }}>Filtré</span>}
            </div>
            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 border-b border-gray-100 animate-pulse">
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-40" />
                  <div className="h-2.5 bg-gray-50 rounded w-52" />
                </div>
                <div className="flex gap-2">
                  <div className="h-7 w-16 bg-gray-100 rounded-lg" />
                  <div className="h-7 w-20 bg-gray-100 rounded-lg" />
                  <div className="h-7 w-24 bg-gray-100 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-20 text-sm">Aucun abonnement{filter !== 'all' ? ' dans ce filtre' : ''}</p>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(sub => (
              <SubscriptionRow
                key={sub.id}
                id={sub.id}
                boutiqueName={sub.boutique?.name ?? '—'}
                plan={sub.plan}
                status={sub.status}
                startedAt={sub.started_at}
                endsAt={sub.ends_at}
                discountPercent={sub.discount_percent}
                discountExpiresAt={sub.discount_expires_at}
                pendingDiscountPercent={sub.pending_discount_percent}
                onChanged={fetchSubs}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
