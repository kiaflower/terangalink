import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { StatCard } from '@/components/dashboard/StatCard'
import Link from 'next/link'
import {
  ShoppingBag, TrendingUp, UtensilsCrossed, Users,
  ArrowRight, AlertCircle, CheckCircle2,
} from 'lucide-react'
import type { Restaurant, Subscription } from '@/lib/types'
import { PLAN_LABELS, normalizePlan } from '@/lib/plans'
import { SubscriptionReminder } from '@/components/dashboard/SubscriptionReminder'
import { HelpCard } from '@/components/dashboard/HelpCard'
import { TipCard } from '@/components/dashboard/TipCard'
import MonthlyHistoryTable from '@/components/dashboard/MonthlyHistoryTable'
import type { MonthRow, OrderDetail, RestaurantStat } from '@/components/dashboard/MonthlyHistoryTable'

export const metadata = { title: 'Tableau de bord — Restaurant' }

function fmt(amount: number) {
  return `${amount.toLocaleString('fr-FR')} FCFA`
}

function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

export default async function RestaurantDashboard() {
  const supabase = await createClient()
  const admin = createAdminClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*, restaurant:restaurants(*)')
    .eq('id', user.id)
    .single()

  const { getImpersonatedRestaurantId, getImpersonatedRestaurant } = await import('@/lib/impersonation')
  const impersonatedId = await getImpersonatedRestaurantId()
  let restaurant: Restaurant | null = profile?.restaurant ?? null
  if (impersonatedId) {
    const imp = await getImpersonatedRestaurant(impersonatedId)
    if (imp) restaurant = imp as Restaurant
  }

  let subscription: Subscription | null = null
  if (restaurant) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .single()
    subscription = sub
  }

  // ── Stats ─────────────────────────────────────────────────────────────────
  let todayOrders = 0
  let totalOrders = 0
  let menuItemsCount = 0
  let totalRevenue = 0
  let monthRevenue = 0
  let prevMonthRevenue = 0
  let monthOrders = 0
  let prevMonthOrders = 0
  let monthlyRows: MonthRow[] = []
  let orderDetails: OrderDetail[] = []
  let restaurantStats: RestaurantStat[] = []

  if (restaurant) {
    const rid = restaurant.id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const prevMonthEnd = monthStart
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1).toISOString()

    const [
      { count: todayCount },
      { count: total },
      { count: itemsCount },
      { data: allDelivered },
      { data: monthDelivered },
      { data: prevMonthDelivered },
      { count: monthCount },
      { count: prevMonthCount },
      { data: historicOrders },
      { data: historicViews },
      { data: allOrdersExport },
    ] = await Promise.all([
      admin.from('orders').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).not('status', 'in', '("cancelled","delivery_cancelled")').gte('created_at', todayStart),
      admin.from('orders').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).not('status', 'in', '("cancelled","delivery_cancelled")'),
      admin.from('menu_items').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('is_available', true),
      admin.from('orders').select('total').eq('restaurant_id', rid).eq('status', 'delivered'),
      admin.from('orders').select('total').eq('restaurant_id', rid).eq('status', 'delivered').gte('created_at', monthStart),
      admin.from('orders').select('total').eq('restaurant_id', rid).eq('status', 'delivered').gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
      admin.from('orders').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).not('status', 'in', '("cancelled","delivery_cancelled")').gte('created_at', monthStart),
      admin.from('orders').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).not('status', 'in', '("cancelled","delivery_cancelled")').gte('created_at', prevMonthStart).lt('created_at', prevMonthEnd),
      admin.from('orders').select('created_at, total, status').eq('restaurant_id', rid).gte('created_at', twelveMonthsAgo).order('created_at', { ascending: true }),
      admin.from('analytics_events').select('created_at').eq('restaurant_id', rid).eq('event_type', 'page_view').gte('created_at', twelveMonthsAgo),
      admin.from('orders').select('id, created_at, total, status, customer_name, customer_phone').eq('restaurant_id', rid).order('created_at', { ascending: false }).limit(5000),
    ])

    todayOrders = todayCount ?? 0
    totalOrders = total ?? 0
    menuItemsCount = itemsCount ?? 0
    totalRevenue = (allDelivered ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
    monthRevenue = (monthDelivered ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
    prevMonthRevenue = (prevMonthDelivered ?? []).reduce((s, o) => s + (o.total ?? 0), 0)
    monthOrders = monthCount ?? 0
    prevMonthOrders = prevMonthCount ?? 0

    // Historique mensuel
    const byMonth: Record<string, { commandes: number; livrees: number; revenus: number }> = {}
    for (const o of historicOrders ?? []) {
      const d = new Date(o.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { commandes: 0, livrees: 0, revenus: 0 }
      if (!['cancelled', 'delivery_cancelled'].includes(o.status)) byMonth[key].commandes++
      if (o.status === 'delivered') { byMonth[key].livrees++; byMonth[key].revenus += o.total ?? 0 }
    }

    const viewsByMonth: Record<string, number> = {}
    for (const v of historicViews ?? []) {
      const d = new Date(v.created_at)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      viewsByMonth[key] = (viewsByMonth[key] ?? 0) + 1
    }

    monthlyRows = Object.entries(byMonth)
      .sort(([a], [b]) => b.localeCompare(a))
      .slice(0, 12)
      .map(([key, v]) => {
        const [y, m] = key.split('-').map(Number)
        return { mois: monthLabel(y, m), ...v, vues: viewsByMonth[key] ?? 0 }
      })

    // Données export Excel
    orderDetails = (allOrdersExport ?? []).map(o => ({
      date: new Date(o.created_at).toLocaleDateString('fr-FR'),
      restaurant: restaurant!.name,
      client: o.customer_name ?? o.customer_phone ?? '—',
      montant: o.total ?? 0,
      statut: o.status,
      numero: `TL-${String(o.id).slice(-6).toUpperCase()}`,
    }))

    restaurantStats = [{
      nom: restaurant.name,
      commandes: totalOrders,
      revenus: totalRevenue,
    }]
  }

  const TL_WHATSAPP = process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP || '221700000000'

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
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
        <div className="bg-gray-50 border border-brand-orange/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-bold text-lg flex-shrink-0">
            {restaurant.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-gray-900 font-semibold">{restaurant.name}</p>
              {restaurant.is_verified && <CheckCircle2 className="w-4 h-4 text-brand-orange" />}
            </div>
            <p className="text-gray-500 text-sm">{(restaurant as Restaurant & { city?: string }).city || 'Dakar'}</p>
          </div>
          {subscription && (
            <Badge variant="warning">{PLAN_LABELS[normalizePlan(subscription.plan)]} · {subscription.status}</Badge>
          )}
        </div>
      )}

      <div className="stats-grid mb-8">
        <StatCard
          title="Revenus totaux"
          value={restaurant ? fmt(totalRevenue) : '—'}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          subtitle={restaurant ? 'Commandes livrées depuis le début' : 'Bientôt disponible'}
          details={restaurant ? [
            { label: 'Ce mois', value: fmt(monthRevenue) },
            { label: 'Mois dernier', value: fmt(prevMonthRevenue) },
          ] : undefined}
        />
        <StatCard
          title="Commandes totales"
          value={restaurant ? String(totalOrders) : '—'}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="orange"
          subtitle={restaurant ? 'Depuis le début' : 'Bientôt disponible'}
          details={restaurant ? [
            { label: 'Ce mois', value: String(monthOrders) },
            { label: 'Mois dernier', value: String(prevMonthOrders) },
            { label: "Aujourd'hui", value: String(todayOrders) },
          ] : undefined}
        />
        <StatCard
          title="Plats au menu"
          value={restaurant ? String(menuItemsCount) : '—'}
          icon={<UtensilsCrossed className="w-5 h-5" />}
          color="blue"
          subtitle={restaurant ? (menuItemsCount === 0 ? 'Aucun plat actif' : `${menuItemsCount} plat${menuItemsCount > 1 ? 's' : ''} disponible${menuItemsCount > 1 ? 's' : ''}`) : 'Bientôt disponible'}
        />
        <StatCard
          title="Commandes aujourd'hui"
          value={restaurant ? String(todayOrders) : '—'}
          icon={<Users className="w-5 h-5" />}
          color="purple"
          subtitle={restaurant ? (todayOrders === 0 ? 'Aucune commande ce jour' : `${todayOrders} commande${todayOrders > 1 ? 's' : ''} active${todayOrders > 1 ? 's' : ''}`) : 'Bientôt disponible'}
        />
      </div>

      {/* ── Historique + export Excel ── */}
      {restaurant && (
        <div className="mb-8">
          <MonthlyHistoryTable
            rows={monthlyRows}
            orderDetails={orderDetails}
            restaurantStats={restaurantStats}
          />
        </div>
      )}

      <TipCard />

      <Card>
        <h2 className="text-gray-900 font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Gérer le menu', desc: 'Ajouter / modifier vos plats', href: '/dashboard/restaurant/menu', icon: UtensilsCrossed },
            { label: 'Voir les commandes', desc: 'Commandes en cours et historique', href: '/dashboard/restaurant/orders', icon: ShoppingBag },
            { label: 'Profil du restaurant', desc: 'Modifier les informations', href: '/dashboard/restaurant/profile', icon: Users },
            { label: 'Paramètres', desc: 'Configuration du compte', href: '/dashboard/restaurant/settings', icon: TrendingUp },
          ].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center gap-3 p-4 bg-gray-100 hover:bg-gray-100 border border-gray-300 rounded-xl transition-all group">
              <div className="w-9 h-9 bg-brand-orange/10 rounded-lg flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                <item.icon className="w-4 h-4 text-brand-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-brand-orange transition-colors" />
            </Link>
          ))}
        </div>
      </Card>

      {restaurant && subscription && (
        <SubscriptionReminder subscription={subscription} tlWhatsapp={TL_WHATSAPP} />
      )}

      {restaurant && (
        <HelpCard
          restaurantId={restaurant.id}
          restaurantName={restaurant.name}
          ownerName={profile?.full_name || user.email || ''}
          email={user.email ?? null}
          whatsapp={(restaurant as Restaurant & { whatsapp_number?: string }).whatsapp_number ?? null}
        />
      )}
    </div>
  )
}
