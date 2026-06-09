import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/dashboard/StatCard'
import Link from 'next/link'
import { ShoppingBag, TrendingUp, UtensilsCrossed, Users, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react'
import type { Restaurant, Subscription } from '@/lib/types'
import { PLAN_LABELS, normalizePlan } from '@/lib/plans'

export const metadata = { title: 'Tableau de bord — Restaurant' }

export default async function RestaurantDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurant:restaurants(*)')
    .eq('id', user.id)
    .single()

  const restaurant: Restaurant | null = profile?.restaurant ?? null

  let subscription: Subscription | null = null
  if (restaurant) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .single()
    subscription = sub
  }

  // ── Vraies données réelles ─────────────────────────────────────────────────
  let todayOrders = 0
  let monthRevenue = 0
  let menuItemsCount = 0
  let totalOrders = 0

  if (restaurant) {
    const rid = restaurant.id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    // Commandes aujourd'hui (non annulées)
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', rid)
      .neq('status', 'cancelled')
      .gte('created_at', todayStart)
    todayOrders = todayCount ?? 0

    // Revenus ce mois (commandes livrées)
    const { data: monthOrders } = await supabase
      .from('orders')
      .select('total')
      .eq('restaurant_id', rid)
      .eq('status', 'delivered')
      .gte('created_at', monthStart)
    monthRevenue = (monthOrders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)

    // Nombre de plats actifs au menu
    const { count: itemsCount } = await supabase
      .from('menu_items')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', rid)
      .eq('is_available', true)
    menuItemsCount = itemsCount ?? 0

    // Total commandes (tous statuts sauf annulées)
    const { count: total } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', rid)
      .neq('status', 'cancelled')
    totalOrders = total ?? 0
  }

  const formatRevenue = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M FCFA`
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`
    return `${amount} FCFA`
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {restaurant ? `Bienvenue, ${restaurant.name}` : 'Tableau de bord'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{profile?.full_name || user.email}</p>
      </div>

      {!restaurant && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-semibold text-sm">Aucun restaurant connecté</p>
            <p className="text-yellow-300/60 text-xs mt-1">Contactez votre administrateur TerangaLink.</p>
          </div>
        </div>
      )}

      {restaurant && (
        <div className="bg-surface-50 border border-brand-orange/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-bold text-lg flex-shrink-0">
            {restaurant.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold">{restaurant.name}</p>
              {restaurant.is_verified && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
            </div>
            <p className="text-gray-500 text-sm">{restaurant.city || 'Dakar'}</p>
          </div>
          {subscription && (
            <Badge variant="warning">{PLAN_LABELS[normalizePlan(subscription.plan)]} · {subscription.status}</Badge>
          )}
        </div>
      )}

      <div className="stats-grid mb-8">
        <StatCard
          title="Commandes aujourd'hui"
          value={restaurant ? String(todayOrders) : '—'}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="orange"
          subtitle={restaurant ? (todayOrders === 0 ? 'Aucune commande ce jour' : `${todayOrders} commande${todayOrders > 1 ? 's' : ''} active${todayOrders > 1 ? 's' : ''}`) : 'Bientôt disponible'}
        />
        <StatCard
          title="Revenus ce mois"
          value={restaurant ? formatRevenue(monthRevenue) : '—'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          subtitle={restaurant ? 'Commandes livrées' : 'Bientôt disponible'}
        />
        <StatCard
          title="Plats au menu"
          value={restaurant ? String(menuItemsCount) : '—'}
          icon={<UtensilsCrossed className="w-5 h-5" />}
          color="blue"
          subtitle={restaurant ? (menuItemsCount === 0 ? 'Aucun plat actif' : `${menuItemsCount} plat${menuItemsCount > 1 ? 's' : ''} disponible${menuItemsCount > 1 ? 's' : ''}`) : 'Bientôt disponible'}
        />
        <StatCard
          title="Commandes totales"
          value={restaurant ? String(totalOrders) : '—'}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          subtitle={restaurant ? 'Depuis le début' : 'Bientôt disponible'}
        />
      </div>

      <Card>
        <h2 className="text-white font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Gérer le menu', desc: 'Ajouter / modifier vos plats', href: '/dashboard/restaurant/menu', icon: UtensilsCrossed },
            { label: 'Voir les commandes', desc: 'Commandes en cours et historique', href: '/dashboard/restaurant/orders', icon: ShoppingBag },
            { label: 'Profil du restaurant', desc: 'Modifier les informations', href: '/dashboard/restaurant/profile', icon: Users },
            { label: 'Paramètres', desc: 'Configuration du compte', href: '/dashboard/restaurant/settings', icon: TrendingUp },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 bg-surface-100 hover:bg-surface-200 border border-surface-300 rounded-xl transition-all group">
              <div className="w-9 h-9 bg-brand-orange/10 rounded-lg flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                <item.icon className="w-4 h-4 text-brand-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-brand-orange transition-colors" />
            </Link>
          ))}
        </div>
      </Card>
    </div>
  )
}
