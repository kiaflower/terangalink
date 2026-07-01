import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Store, Users, TrendingUp, Activity, ArrowRight, PlusCircle, Eye, ShoppingBag, Tag } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { normalizePlan, PLAN_LABELS, PLAN_PRICES } from '@/lib/plans'
import type { Restaurant, Profile, Subscription } from '@/lib/types'
import MonthlyHistoryTable from '@/components/dashboard/MonthlyHistoryTable'
import type { MonthRow, OrderDetail, RestaurantStat } from '@/components/dashboard/MonthlyHistoryTable'

export const metadata = { title: "Super Admin — Vue d'ensemble" }

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default async function SuperAdminDashboard() {
  const supabase = await createClient()
  const admin = createAdminClient()

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
  const prevMonthEnd = monthStart
  const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()

  const [
    { count: totalRestaurants },
    { count: totalAdmins },
    { count: activeRestaurants },
    // Vues — total + ce mois + mois dernier
    { count: totalPageViews },
    { count: monthPageViews },
    { count: prevMonthPageViews },
    // Commandes — total + ce mois + mois dernier
    { count: totalOrders },
    { count: monthOrders },
    { count: prevMonthOrders },
    // Revenus livrés — total + ce mois
    { data: allDelivered },
    { data: monthDelivered },
    { data: prevMonthDelivered },
    // Listes
    { data: recentRestaurants },
    { data: recentAdmins },
    { data: subscriptions },
    // Historique 12 mois
    { data: historicOrders },
    { data: historicViews },
    // Pour export Excel
    { data: allOrders },
    { data: allRestaurants },
  ] = await Promise.all([
    admin.from('restaurants').select('*', { count: 'exact', head: true }),
    admin.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_admin'),
    admin.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    // Vues
    admin.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'page_view'),
    admin.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'page_view').gte('created_at', monthStart),
    admin.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'page_view').gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
    // Commandes
    admin.from('orders').select('*', { count: 'exact', head: true }),
    admin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
    // Revenus
    admin.from('orders').select('total').eq('status', 'delivered'),
    admin.from('orders').select('total').eq('status', 'delivered').gte('created_at', monthStart),
    admin.from('orders').select('total').eq('status', 'delivered').gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
    // Listes
    admin.from('restaurants').select('id, name, slug, city, is_active, created_at').order('created_at', { ascending: false }).limit(5),
    admin.from('profiles').select('id, email, full_name, restaurant_id, created_at').eq('role', 'restaurant_admin').order('created_at', { ascending: false }).limit(5),
    admin.from('subscriptions').select('*').eq('status', 'active'),
    // Historique commandes 12 mois
    admin.from('orders').select('created_at, total, status, restaurant_id').gte('created_at', twelveMonthsAgo).order('created_at', { ascending: true }),
    // Historique vues 12 mois
    admin.from('analytics_events').select('created_at').eq('event_type', 'page_view').gte('created_at', twelveMonthsAgo),
    // Export — toutes les commandes + restaurants
    admin.from('orders').select('id, created_at, total, status, restaurant_id, customer_name, customer_phone').order('created_at', { ascending: false }).limit(5000),
    admin.from('restaurants').select('id, name').order('name'),
  ])

  const totalRevenue = (allDelivered ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
  const monthRevenue = (monthDelivered ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
  const prevMonthRevenue = (prevMonthDelivered ?? []).reduce((s, o) => s + (o.total ?? 0), 0)

  const estimatedRevenue = (subscriptions ?? []).reduce((sum, sub: Subscription) => {
    return sum + (PLAN_PRICES[normalizePlan(sub.plan)] ?? 0)
  }, 0)

  const planCounts = (subscriptions ?? []).reduce((acc, sub: Subscription) => {
    const plan = normalizePlan(sub.plan)
    acc[plan] = (acc[plan] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // ── Historique mensuel ────────────────────────────────────────────────────
  const restaurantNameMap: Record<string, string> = {}
  for (const r of allRestaurants ?? []) restaurantNameMap[r.id] = r.name

  const byMonth: Record<string, { commandes: number; livrees: number; revenus: number }> = {}
  for (const o of historicOrders ?? []) {
    const d = new Date(o.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    if (!byMonth[key]) byMonth[key] = { commandes: 0, livrees: 0, revenus: 0 }
    byMonth[key].commandes++
    if (o.status === 'delivered') { byMonth[key].livrees++; byMonth[key].revenus += o.total ?? 0 }
  }

  const viewsByMonth: Record<string, number> = {}
  for (const v of historicViews ?? []) {
    const d = new Date(v.created_at)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    viewsByMonth[key] = (viewsByMonth[key] ?? 0) + 1
  }

  const monthlyRows: MonthRow[] = Object.entries(byMonth)
    .sort(([a], [b]) => b.localeCompare(a))
    .slice(0, 12)
    .map(([key, v]) => {
      const [y, m] = key.split('-').map(Number)
      return { mois: monthLabel(y, m), ...v, vues: viewsByMonth[key] ?? 0 }
    })

  // ── Données export Excel ──────────────────────────────────────────────────
  const orderDetails: OrderDetail[] = (allOrders ?? []).map(o => ({
    date: new Date(o.created_at).toLocaleDateString('fr-FR'),
    restaurant: restaurantNameMap[o.restaurant_id] ?? o.restaurant_id,
    client: o.customer_name ?? o.customer_phone ?? '—',
    montant: o.total ?? 0,
    statut: o.status,
    numero: `TL-${String(o.id).slice(-6).toUpperCase()}`,
  }))

  const restaurantOrderMap: Record<string, { commandes: number; revenus: number }> = {}
  for (const o of allOrders ?? []) {
    if (!restaurantOrderMap[o.restaurant_id]) restaurantOrderMap[o.restaurant_id] = { commandes: 0, revenus: 0 }
    restaurantOrderMap[o.restaurant_id].commandes++
    if (o.status === 'delivered') restaurantOrderMap[o.restaurant_id].revenus += o.total ?? 0
  }
  const restaurantStats: RestaurantStat[] = (allRestaurants ?? []).map(r => ({
    nom: r.name,
    commandes: restaurantOrderMap[r.id]?.commandes ?? 0,
    revenus: restaurantOrderMap[r.id]?.revenus ?? 0,
  })).sort((a, b) => b.revenus - a.revenus)

  const fmtRev = (n: number) => `${n.toLocaleString('fr-FR')} FCFA`

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vue d&apos;ensemble</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue dans votre panneau d&apos;administration TerangaLink</p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Restaurants total" value={totalRestaurants ?? 0}
          icon={<Store className="w-5 h-5" />} color="orange" subtitle="Sur la plateforme" />
        <StatCard title="Restaurants actifs" value={activeRestaurants ?? 0}
          icon={<Activity className="w-5 h-5" />} color="green" subtitle="En ligne" />
        <StatCard title="Admins restaurant" value={totalAdmins ?? 0}
          icon={<Users className="w-5 h-5" />} color="blue" subtitle="Comptes actifs" />
        <StatCard
          title="Revenus abonnements/mois"
          value={formatCurrency(estimatedRevenue)}
          icon={<TrendingUp className="w-5 h-5" />} color="purple" subtitle="Abonnements actifs"
        />
        <StatCard
          title="Pages vues (total)"
          value={(totalPageViews ?? 0).toLocaleString()}
          icon={<Eye className="w-5 h-5" />} color="orange" subtitle="Tous restaurants"
          details={[
            { label: 'Ce mois', value: (monthPageViews ?? 0).toLocaleString() },
            { label: 'Mois dernier', value: (prevMonthPageViews ?? 0).toLocaleString() },
          ]}
        />
        <StatCard
          title="Commandes (total)"
          value={(totalOrders ?? 0).toLocaleString()}
          icon={<ShoppingBag className="w-5 h-5" />} color="green" subtitle="Toute la plateforme"
          details={[
            { label: 'Ce mois', value: (monthOrders ?? 0).toLocaleString() },
            { label: 'Mois dernier', value: (prevMonthOrders ?? 0).toLocaleString() },
          ]}
        />
      </div>

      {/* Revenus réels livrés */}
      <div className="grid grid-cols-3 gap-3 mb-8">
        <div className="rounded-2xl p-5 col-span-3 sm:col-span-1" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
          <p className="text-xs font-semibold text-orange-400 mb-1 uppercase tracking-wide">Revenus livrés (total)</p>
          <p className="text-3xl font-black text-orange-600">{fmtRev(totalRevenue)}</p>
          <div className="mt-2 flex flex-col gap-0.5">
            <p className="text-xs text-orange-400">Ce mois : <span className="font-semibold text-orange-600">{fmtRev(monthRevenue)}</span></p>
            <p className="text-xs text-orange-400">Mois dernier : <span className="font-semibold text-orange-600">{fmtRev(prevMonthRevenue)}</span></p>
          </div>
        </div>

        {(['starter', 'pro', 'premium'] as const).map(plan => (
          <div key={plan} className="rounded-2xl p-4 text-center"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <p className="text-xs font-semibold text-gray-400 mb-1 uppercase tracking-wide">{plan}</p>
            <p className="text-3xl font-black text-gray-900">{planCounts[plan] ?? 0}</p>
            <p className="text-xs text-gray-400 mt-0.5">{formatCurrency(PLAN_PRICES[plan] ?? 0)}/mois</p>
          </div>
        ))}
      </div>

      {/* Actions rapides */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
        {[
          { href: '/dashboard/super-admin/create-admin', icon: PlusCircle, label: 'Créer un restaurant', sub: 'Nouveau restaurant + admin', color: 'text-brand-orange', bg: 'bg-orange-50' },
          { href: '/dashboard/super-admin/restaurants', icon: Store, label: 'Gérer les restaurants', sub: 'Boost, plans, statuts', color: 'text-blue-500', bg: 'bg-blue-50' },
          { href: '/dashboard/super-admin/promo-codes', icon: Tag, label: 'Codes promo', sub: 'Créer et gérer des codes', color: 'text-green-600', bg: 'bg-green-50' },
        ].map(({ href, icon: Icon, label, sub, color, bg }) => (
          <Link key={href} href={href}
            className="flex items-center gap-4 rounded-2xl p-4 transition-all hover:shadow-md group"
            style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">{label}</p>
              <p className="text-gray-400 text-xs truncate">{sub}</p>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-gray-600 group-hover:translate-x-0.5 transition-all" />
          </Link>
        ))}
      </div>

      {/* Historique mensuel + export Excel */}
      <div className="mb-8">
        <MonthlyHistoryTable
          rows={monthlyRows}
          orderDetails={orderDetails}
          restaurantStats={restaurantStats}
        />
      </div>

      {/* Restaurants + Admins récents */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold">Restaurants récents</h2>
            <Link href="/dashboard/super-admin/restaurants" className="text-xs text-brand-orange hover:underline">Voir tout</Link>
          </div>
          {!recentRestaurants?.length ? (
            <p className="text-gray-400 text-sm py-4 text-center">Aucun restaurant</p>
          ) : (
            <div className="space-y-3">
              {recentRestaurants.map((r: Restaurant) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#F97316' }}>
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-medium truncate">{r.name}</p>
                    <p className="text-gray-400 text-xs">{r.city ?? 'Sénégal'} · {formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/${r.slug}`} target="_blank" className="text-gray-400 hover:text-brand-orange text-xs transition-colors">Voir →</Link>
                    <Badge variant={r.is_active ? 'success' : 'warning'}>{r.is_active ? 'Actif' : 'Inactif'}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold">Admins récents</h2>
            <Link href="/dashboard/super-admin/users" className="text-xs text-brand-orange hover:underline">Voir tout</Link>
          </div>
          {!recentAdmins?.length ? (
            <p className="text-gray-400 text-sm py-4 text-center">Aucun admin</p>
          ) : (
            <div className="space-y-3">
              {recentAdmins.map((p: Profile) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: '#F97316' }}>
                    {(p.full_name || p.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 text-sm font-medium truncate">{p.full_name || 'Sans nom'}</p>
                    <p className="text-gray-400 text-xs truncate">{p.email}</p>
                  </div>
                  <Badge variant={p.restaurant_id ? 'success' : 'warning'}>
                    {p.restaurant_id ? 'Assigné' : 'Non assigné'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
