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

  // ── Données réelles ────────────────────────────────────────────────────────
  let todayOrders = 0
  let monthRevenue = 0
  let menuItemsCount = 0
  let totalOrders = 0
  let hasWave = false
  let hasOrangeMoney = false
  let hasFeaturedProduct = false
  let lastMenuUpdate: string | null = null
  let lastOrderDate: string | null = null

  if (restaurant) {
    const rid = restaurant.id
    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const [
      { count: todayCount },
      { data: monthOrders },
      { count: itemsCount },
      { count: total },
      { data: restoDetails },
      { data: featuredItem },
      { data: lastMenuItem },
      { data: lastOrder },
    ] = await Promise.all([
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).not('status', 'in', '("cancelled","delivery_cancelled")').gte('created_at', todayStart),
      supabase.from('orders').select('total')
        .eq('restaurant_id', rid).eq('status', 'delivered').gte('created_at', monthStart),
      supabase.from('menu_items').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).eq('is_available', true),
      supabase.from('orders').select('*', { count: 'exact', head: true })
        .eq('restaurant_id', rid).not('status', 'in', '("cancelled","delivery_cancelled")'),
      supabase.from('restaurants').select('wave_number, orange_money_number')
        .eq('id', rid).single(),
      supabase.from('menu_items').select('id').eq('restaurant_id', rid)
        .eq('is_featured', true).limit(1),
      supabase.from('menu_items').select('updated_at').eq('restaurant_id', rid)
        .order('updated_at', { ascending: false }).limit(1),
      supabase.from('orders').select('created_at').eq('restaurant_id', rid)
        .order('created_at', { ascending: false }).limit(1),
    ])

    todayOrders = todayCount ?? 0
    monthRevenue = (monthOrders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)
    menuItemsCount = itemsCount ?? 0
    totalOrders = total ?? 0
    hasWave = !!(restoDetails as { wave_number?: string | null } | null)?.wave_number
    hasOrangeMoney = !!(restoDetails as { orange_money_number?: string | null } | null)?.orange_money_number
    hasFeaturedProduct = (featuredItem?.length ?? 0) > 0
    lastMenuUpdate = (lastMenuItem?.[0] as { updated_at?: string } | undefined)?.updated_at ?? null
    lastOrderDate = (lastOrder?.[0] as { created_at?: string } | undefined)?.created_at ?? null
  }

  const formatRevenue = (amount: number) => {
    if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M FCFA`
    if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k FCFA`
    return `${amount} FCFA`
  }

  // Numéro WhatsApp TerangaLink pour les boutons d'abonnement
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

      {/* ── Rappel abonnement ── */}
      {restaurant && subscription && (
        <SubscriptionReminder
          subscription={subscription}
          tlWhatsapp={TL_WHATSAPP}
        />
      )}


      {/* ── Carte Besoin d'aide ? ── */}
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
