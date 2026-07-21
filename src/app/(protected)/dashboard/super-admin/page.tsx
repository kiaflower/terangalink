'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Store, CheckCircle, ClipboardList, ShoppingBag, CreditCard, CalendarClock, RefreshCw } from 'lucide-react'
import { StatusBadge } from '@/components/ui/StatusBadge'

interface Stats {
  boutiquesCount: number
  activeCount: number
  inscriptionsCount: number
  ordersCount: number
  activeSubsCount: number
  rdvCount: number
}

interface Inscription {
  id: string
  boutique_name: string
  owner_name: string
  city: string | null
  status: string
  created_at: string
}

function formatRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

export default function SuperAdminDashboard() {
  const supabase = createClient()
  const [stats, setStats] = useState<Stats | null>(null)
  const [inscriptions, setInscriptions] = useState<Inscription[]>([])
  const [loading, setLoading] = useState(true)
  // null jusqu'au premier fetch côté client : évite un mismatch d'hydratation
  // (new Date() rendu côté serveur diffère forcément de celui du client).
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

  const fetchData = useCallback(async () => {
    const yesterday = new Date(Date.now() - 86400000).toISOString()
    const [
      { count: boutiquesCount },
      { count: activeCount },
      { count: inscriptionsCount },
      { count: ordersCount },
      { count: activeSubsCount },
      { count: rdvCount },
      { data: recentIns },
    ] = await Promise.all([
      supabase.from('boutiques').select('*', { count: 'exact', head: true }),
      supabase.from('boutiques').select('*', { count: 'exact', head: true }).eq('is_active', true),
      supabase.from('inscriptions').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', yesterday),
      supabase.from('subscriptions').select('*', { count: 'exact', head: true }).in('status', ['active', 'trial']),
      supabase.from('appointment_requests').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('inscriptions').select('id, boutique_name, owner_name, city, status, created_at').eq('status', 'pending').order('created_at', { ascending: false }).limit(6),
    ])
    setStats({
      boutiquesCount: boutiquesCount ?? 0,
      activeCount: activeCount ?? 0,
      inscriptionsCount: inscriptionsCount ?? 0,
      ordersCount: ordersCount ?? 0,
      activeSubsCount: activeSubsCount ?? 0,
      rdvCount: rdvCount ?? 0,
    })
    setInscriptions(recentIns ?? [])
    setLastRefresh(new Date())
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData()

    // Refresh every 30s
    const interval = setInterval(fetchData, 30000)

    // Real-time subscriptions on key tables
    const channel = supabase
      .channel('super-admin-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'inscriptions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'subscriptions' }, fetchData)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'appointment_requests' }, fetchData)
      .subscribe()

    return () => {
      clearInterval(interval)
      supabase.removeChannel(channel)
    }
  }, [fetchData])

  const statCards = stats ? [
    { label: 'Total boutiques', value: stats.boutiquesCount, href: '/dashboard/super-admin/boutiques', Icon: Store, color: '#F97316' },
    { label: 'Boutiques actives', value: stats.activeCount, href: '/dashboard/super-admin/boutiques', Icon: CheckCircle, color: '#059669' },
    { label: 'Inscriptions en attente', value: stats.inscriptionsCount, href: '/dashboard/super-admin/inscriptions', Icon: ClipboardList, color: '#DC2626', alert: true },
    { label: 'Commandes (24h)', value: stats.ordersCount, href: '/dashboard/super-admin/boutiques', Icon: ShoppingBag, color: '#D97706' },
    { label: 'Abonnements actifs/essai', value: stats.activeSubsCount, href: '/dashboard/super-admin/subscriptions', Icon: CreditCard, color: '#2563EB' },
    { label: 'RDV en attente', value: stats.rdvCount, href: '/dashboard/super-admin/appointments', Icon: CalendarClock, color: '#0891B2' },
  ] : []

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Vue d&apos;ensemble · en temps réel</p>
        </div>
        <button onClick={fetchData}
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-brand-orange border border-gray-200 rounded-lg px-3 py-2 transition-colors">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">
            {lastRefresh ? lastRefresh.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '—'}
          </span>
        </button>
      </div>

      {/* Live indicator */}
      <div className="inline-flex items-center gap-1.5 text-xs text-green-600 bg-green-50 border border-green-100 rounded-full px-3 py-1 mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
        Données en direct
      </div>

      {/* Stats grid */}
      {loading && !stats ? (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-50 border border-gray-200 rounded-2xl p-5 animate-pulse h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {statCards.map(({ label, value, href, Icon, color, alert }) => (
            <Link key={label} href={href}
              className="bg-white border border-gray-200 rounded-2xl p-5 hover:shadow-sm hover:border-gray-300 transition-all group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full rounded-l-2xl" style={{ backgroundColor: color }} />
              <div className="flex items-center justify-between mb-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + '15' }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                {alert && (value as number) > 0 && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                )}
              </div>
              <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
              <p className="text-xs text-gray-500 mt-1 leading-snug">{label}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Recent inscriptions */}
      {inscriptions.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl">
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <h2 className="text-sm font-semibold text-gray-900">Inscriptions récentes</h2>
            <Link href="/dashboard/super-admin/inscriptions" className="text-xs text-brand-orange hover:text-brand-orange-dark transition-colors">Voir tout</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {inscriptions.map(ins => (
              <div key={ins.id} className="px-5 py-3.5 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{ins.boutique_name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{ins.owner_name}{ins.city ? ` · ${ins.city}` : ''}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-gray-400 hidden sm:block">{formatRelative(ins.created_at)}</span>
                  <StatusBadge status={ins.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && inscriptions.length === 0 && (
        <div className="bg-gray-50 border border-gray-100 rounded-2xl py-12 text-center">
          <p className="text-sm text-gray-400">Aucune inscription en attente</p>
        </div>
      )}
    </div>
  )
}
