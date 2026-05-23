import { createClient } from '@/lib/supabase/server'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { Store, Users, TrendingUp, Activity, ArrowRight, PlusCircle } from 'lucide-react'
import { formatDate, formatCurrency, PLAN_PRICES } from '@/lib/utils'
import { normalizePlan, PLAN_LABELS } from '@/lib/plans'
import type { Restaurant, Profile, Subscription } from '@/lib/types'

export const metadata = { title: 'Super Admin — Vue d\'ensemble' }

export default async function SuperAdminDashboard() {
  const supabase = await createClient()

  const [
    { count: totalRestaurants },
    { count: totalAdmins },
    { count: activeRestaurants },
    { data: recentRestaurants },
    { data: recentAdmins },
    { data: subscriptions },
  ] = await Promise.all([
    supabase.from('restaurants').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_admin'),
    supabase.from('restaurants').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('restaurants').select('*').order('created_at', { ascending: false }).limit(5),
    supabase.from('profiles').select('*').eq('role', 'restaurant_admin').order('created_at', { ascending: false }).limit(5),
    supabase.from('subscriptions').select('*').eq('status', 'active'),
  ])

  // Estimate monthly revenue from active subscriptions
  const estimatedRevenue = (subscriptions ?? []).reduce((sum, sub: Subscription) => {
    return sum + (PLAN_PRICES[normalizePlan(sub.plan)] ?? 0)
  }, 0)

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Vue d&apos;ensemble</h1>
        <p className="text-gray-500 text-sm mt-1">Bienvenue dans votre panneau d&apos;administration TerangaLink</p>
      </div>

      {/* Stats */}
      <div className="stats-grid mb-8">
        <StatCard
          title="Restaurants total"
          value={totalRestaurants ?? 0}
          icon={<Store className="w-5 h-5" />}
          color="orange"
          subtitle="Sur la plateforme"
        />
        <StatCard
          title="Restaurants actifs"
          value={activeRestaurants ?? 0}
          icon={<Activity className="w-5 h-5" />}
          color="green"
          subtitle="En ligne"
        />
        <StatCard
          title="Admins restaurant"
          value={totalAdmins ?? 0}
          icon={<Users className="w-5 h-5" />}
          color="blue"
          subtitle="Comptes actifs"
        />
        <StatCard
          title="Revenus estimés/mois"
          value={formatCurrency(estimatedRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="purple"
          subtitle="Abonnements actifs"
        />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <Link
          href="/dashboard/super-admin/create-admin"
          className="flex items-center gap-4 bg-surface-50 border border-surface-200 hover:border-brand-orange/30 rounded-2xl p-5 transition-all duration-200 group"
        >
          <div className="w-11 h-11 bg-brand-orange/10 rounded-xl flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
            <PlusCircle className="w-5 h-5 text-brand-orange" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Créer un restaurant</p>
            <p className="text-gray-500 text-xs">Ajouter un nouveau restaurant + admin</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-brand-orange transition-colors" />
        </Link>

        <Link
          href="/dashboard/super-admin/restaurants"
          className="flex items-center gap-4 bg-surface-50 border border-surface-200 hover:border-brand-orange/30 rounded-2xl p-5 transition-all duration-200 group"
        >
          <div className="w-11 h-11 bg-blue-500/10 rounded-xl flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
            <Store className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-semibold text-sm">Gérer les restaurants</p>
            <p className="text-gray-500 text-xs">Voir et modifier tous les restaurants</p>
          </div>
          <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 transition-colors" />
        </Link>
      </div>

      {/* Recent data */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Restaurants récents</h2>
            <Link href="/dashboard/super-admin/restaurants" className="text-xs text-brand-orange hover:underline">
              Voir tout
            </Link>
          </div>
          {!recentRestaurants?.length ? (
            <p className="text-gray-500 text-sm py-4 text-center">Aucun restaurant pour l&apos;instant</p>
          ) : (
            <div className="space-y-3">
              {recentRestaurants.map((r: Restaurant) => (
                <div key={r.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-brand-orange/10 rounded-lg flex items-center justify-center text-brand-orange text-xs font-bold flex-shrink-0">
                    {r.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{r.name}</p>
                    <p className="text-gray-500 text-xs">{r.city || 'Dakar'} · {formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/${r.slug}`}
                      target="_blank"
                      className="text-gray-600 hover:text-brand-orange text-xs transition-colors"
                    >
                      Voir →
                    </Link>
                    <Badge variant={r.is_active ? 'success' : 'warning'}>
                      {r.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-white font-semibold">Admins récents</h2>
            <Link href="/dashboard/super-admin/users" className="text-xs text-brand-orange hover:underline">
              Voir tout
            </Link>
          </div>
          {!recentAdmins?.length ? (
            <p className="text-gray-500 text-sm py-4 text-center">Aucun admin pour l&apos;instant</p>
          ) : (
            <div className="space-y-3">
              {recentAdmins.map((p: Profile) => (
                <div key={p.id} className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-surface-200 rounded-full flex items-center justify-center text-gray-400 text-xs font-bold flex-shrink-0">
                    {(p.full_name || p.email).charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{p.full_name || 'Sans nom'}</p>
                    <p className="text-gray-500 text-xs truncate">{p.email}</p>
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
