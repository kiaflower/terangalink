import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Store, Users, TrendingUp, Activity, ArrowRight, PlusCircle, Eye, ShoppingBag, Tag } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { normalizePlan, PLAN_LABELS, PLAN_PRICES } from '@/lib/plans'
import type { Restaurant, Profile, Subscription } from '@/lib/types'

export const metadata = { title: "Super Admin — Vue d'ensemble" }

export default async function SuperAdminDashboard() {
  const supabase = await createClient()
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalRestaurants },
    { count: totalAdmins },
    { count: activeRestaurants },
    { count: totalPageViews },
    { count: totalOrders30d },
    { data: recentRestaurants },
    { data: recentAdmins },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_admin'),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('analytics_events').select('*', { count: 'exact', head: true }).eq('event_type', 'page_view').gte('created_at', since30d),
    supabase.from('orders').select('*', { count: 'exact', head: true }).gte('created_at', since30d),
    supabase.from('restaurants').select('id, name, slug, city, is_active, created_at').order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('id, email, full_name, restaurant_id, created_at').eq('role', 'restaurant_admin').order('created_at', { ascending: false }).limit(5),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
  ])

  const estimatedRevenue = (subscriptions ?? []).reduce((sum, sub: Subscription) => {
    return sum + (PLAN_PRICES[normalizePlan(sub.plan)] ?? 0)
  }, 0)

  const planCounts = (subscriptions ?? []).reduce((acc, sub: Subscription) => {
    const plan = normalizePlan(sub.plan)
    acc[plan] = (acc[plan] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Vue d&apos;ensemble</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue dans votre panneau d&apos;administration TerangaLink</p>
      </div>

      {/* 6 stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard title="Restaurants total" value={totalRestaurants ?? 0}
          icon={<Store className="w-5 h-5" />} color="orange" subtitle="Sur la plateforme" />
        <StatCard title="Restaurants actifs" value={activeRestaurants ?? 0}
          icon={<Activity className="w-5 h-5" />} color="green" subtitle="En ligne" />
        <StatCard title="Admins restaurant" value={totalAdmins ?? 0}
          icon={<Users className="w-5 h-5" />} color="blue" subtitle="Comptes actifs" />
        <StatCard title="Revenus estimés/mois" value={formatCurrency(estimatedRevenue)}
          icon={<TrendingUp className="w-5 h-5" />} color="purple" subtitle="Abonnements actifs" />
        <StatCard title="Pages vues (30j)" value={(totalPageViews ?? 0).toLocaleString()}
          icon={<Eye className="w-5 h-5" />} color="orange" subtitle="Tous restaurants" />
        <StatCard title="Commandes (30j)" value={(totalOrders30d ?? 0).toLocaleString()}
          icon={<ShoppingBag className="w-5 h-5" />} color="green" subtitle="Toute la plateforme" />
      </div>

      {/* Répartition plans */}
      <div className="grid grid-cols-3 gap-3 mb-8">
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
