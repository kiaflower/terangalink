import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ShoppingBag, TrendingUp, Package, Eye, ArrowRight, AlertCircle, BarChart2 } from 'lucide-react'
import { StatCard } from '@/components/dashboard/StatCard'
import { TipCard } from '@/components/dashboard/TipCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { FeatureGate } from '@/components/FeatureGate'
import { formatPrice } from '@/lib/utils'
import type { PlanKey } from '@/lib/plans'

export default async function RestaurantDashboardHome() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const cookieStore = cookies()
  const impersonateCookie = cookieStore.get('sa_impersonate')?.value

  let restaurantId: string | null = null
  if (impersonateCookie) {
    restaurantId = impersonateCookie
  } else {
    const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    restaurantId = profile?.restaurant_id ?? null
  }

  if (!restaurantId) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center mb-4">
          <AlertCircle className="w-5 h-5 text-amber-500" />
        </div>
        <p className="text-gray-700 font-medium mb-1">Aucun restaurant associé</p>
        <p className="text-sm text-gray-400">Contactez le support TerangaLink.</p>
      </div>
    )
  }

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('name, city, slug, is_verified, wave_number, orange_money_number')
    .eq('id', restaurantId)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('restaurant_id', restaurantId)
    .single()

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString()

  const [
    { data: todayOrders },
    { data: monthOrders },
    { count: productsCount },
    { count: viewsCount },
    { data: recentOrders },
    { data: lowStockProducts },
  ] = await Promise.all([
    supabase.from('orders').select('total, status').eq('restaurant_id', restaurantId).gte('created_at', today.toISOString()),
    supabase.from('orders').select('total').eq('restaurant_id', restaurantId).eq('status', 'delivered').gte('created_at', monthStart),
    supabase.from('menu_items').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_available', true),
    supabase.from('analytics_events').select('id', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('event_type', 'restaurant_view').gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    supabase.from('orders').select('*').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(5),
    supabase.from('menu_items').select('id, name, image_url, stock_quantity').eq('restaurant_id', restaurantId).eq('track_stock', true).eq('is_available', true).lte('stock_quantity', 5).order('stock_quantity'),
  ])

  const monthRevenue = (monthOrders ?? []).reduce((sum, o) => sum + (o.total ?? 0), 0)

  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const showMonthlyBanner = today.getDate() >= daysInMonth - 2

  const planLabel: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro' }
  const planVariant: Record<string, 'default' | 'orange'> = { free: 'default', starter: 'default', pro: 'orange' }
  const plan: PlanKey = subscription?.plan === 'pro' || subscription?.plan === 'starter' ? subscription.plan : 'free'

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {restaurant ? `Bienvenue, ${restaurant.name}` : 'Tableau de bord'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{user.email}</p>
      </div>

      {restaurant && (
        <div className="bg-gray-50 border border-brand-orange/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-bold text-lg flex-shrink-0">
            {restaurant.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold">{restaurant.name}</p>
            <p className="text-gray-500 text-sm">{restaurant.city || 'Dakar'}</p>
          </div>
          {subscription && (
            <Badge variant={planVariant[subscription.plan] ?? 'default'}>
              {planLabel[subscription.plan] ?? subscription.plan} · {subscription.status}
            </Badge>
          )}
        </div>
      )}

      <div className="mb-6">
        <FeatureGate plan={plan} feature="qrCode" requiredPlanLabel="Starter"
          description="Débloquez le QR code téléchargeable, les avis clients, le suivi de commande, les bannières, jusqu'à 30 plats et le parcours d'achat dans vos analytiques.">
          {null}
        </FeatureGate>
        <FeatureGate plan={plan} feature="analyticsAvances" requiredPlanLabel="Pro"
          description="Débloquez le menu illimité, les variantes plat, la gestion de stock, les codes promo, les précommandes et les analytiques complètes (abandon de panier, recommandations).">
          {null}
        </FeatureGate>
      </div>

      {showMonthlyBanner && (
        <div className="mb-6 rounded-2xl p-5 flex items-center gap-4" style={{ backgroundColor: '#FFF7ED', border: '1.5px solid #FED7AA' }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: 'rgba(249,115,22,0.12)' }}>
            <BarChart2 className="w-5 h-5 text-brand-orange" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 text-sm">Bilan de fin de mois</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Ce mois : <span className="font-semibold text-gray-700">{formatPrice(monthRevenue)}</span> de revenus · <span className="font-semibold text-gray-700">{monthOrders?.length ?? 0}</span> commandes livrées.
            </p>
          </div>
          <Link href="/dashboard/restaurant/analytics"
            className="text-xs font-bold px-3 py-2 rounded-xl text-white flex-shrink-0 transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F97316' }}>
            Voir l&apos;analyse
          </Link>
        </div>
      )}

      <div className="stats-grid mb-8">
        <StatCard
          title="Commandes aujourd'hui"
          value={String(todayOrders?.length ?? 0)}
          icon={<ShoppingBag className="w-5 h-5" />}
          color="orange"
          subtitle={(todayOrders?.length ?? 0) === 0 ? 'Aucune commande ce jour' : `${todayOrders?.length} commande(s) active(s)`}
        />
        <StatCard
          title="Revenus ce mois"
          value={formatPrice(monthRevenue)}
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          subtitle="Commandes livrées"
        />
        <StatCard
          title="Plats actifs"
          value={String(productsCount ?? 0)}
          icon={<Package className="w-5 h-5" />}
          color="blue"
          subtitle={(productsCount ?? 0) === 0 ? 'Aucun plat actif' : `${productsCount} plat(s) disponible(s)`}
        />
        <StatCard
          title="Vues (7 jours)"
          value={String(viewsCount ?? 0)}
          icon={<Eye className="w-5 h-5" />}
          color="amber"
          subtitle="Visites de votre vitrine"
        />
      </div>

      <TipCard />

      <Card className="mb-6">
        <h2 className="text-gray-900 font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Gérer le menu', desc: 'Ajouter et modifier vos plats', href: '/dashboard/restaurant/menu', icon: Package },
            { label: 'Voir les commandes', desc: 'Commandes en cours et historique', href: '/dashboard/restaurant/orders', icon: ShoppingBag },
            { label: 'Profil du restaurant', desc: 'Modifier les informations', href: '/dashboard/restaurant/profile', icon: TrendingUp },
            { label: 'Paramètres', desc: 'Configuration du compte', href: '/dashboard/restaurant/settings', icon: Eye },
          ].map((item) => (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:border-brand-orange/30 hover:bg-brand-orange/5 transition-all group">
              <div className="w-9 h-9 bg-brand-orange/10 rounded-lg flex items-center justify-center group-hover:bg-brand-orange/20 transition-colors">
                <item.icon className="w-4 h-4 text-brand-orange" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-gray-900 text-sm font-medium">{item.label}</p>
                <p className="text-gray-500 text-xs">{item.desc}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-400 group-hover:text-brand-orange transition-colors" />
            </Link>
          ))}
        </div>
      </Card>

      {lowStockProducts && lowStockProducts.length > 0 && (
        <Card className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Stock faible
            </h2>
            <Link href="/dashboard/restaurant/menu" className="text-sm text-brand-orange hover:text-brand-orange-dark transition-colors">
              Gérer le menu
            </Link>
          </div>
          <div className="space-y-3">
            {lowStockProducts.map(p => (
              <div key={p.id} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                {p.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <Package className="w-4 h-4 text-gray-300" />
                  </div>
                )}
                <p className="flex-1 min-w-0 text-sm font-medium text-gray-900 truncate">{p.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.stock_quantity === 0 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                  {p.stock_quantity === 0 ? 'Épuisé' : `${p.stock_quantity} restant${p.stock_quantity > 1 ? 's' : ''}`}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {recentOrders && recentOrders.length > 0 && (
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-gray-900 font-semibold">Commandes récentes</h2>
            <Link href="/dashboard/restaurant/orders" className="text-sm text-brand-orange hover:text-brand-orange-dark transition-colors">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {recentOrders.map(order => (
              <div key={order.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-gray-900 text-sm font-medium">{order.order_number}</p>
                  <p className="text-gray-500 text-xs">{order.customer_name} · {new Date(order.created_at).toLocaleDateString('fr-SN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-brand-orange font-semibold text-sm">{formatPrice(order.total)}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    order.status === 'pending' ? 'bg-amber-50 text-amber-600' :
                    order.status === 'confirmed' ? 'bg-blue-50 text-blue-600' :
                    order.status === 'delivered' ? 'bg-green-50 text-green-600' :
                    order.status === 'cancelled' ? 'bg-red-50 text-red-600' :
                    'bg-gray-50 text-gray-600'
                  }`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
