import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/dashboard/StatCard'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import {
  ShoppingBag,
  TrendingUp,
  UtensilsCrossed,
  Users,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import type { Restaurant, Subscription } from '@/lib/types'

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

  const planColors: Record<string, 'success' | 'warning' | 'orange'> = {
    active: 'success',
    trial: 'warning',
    suspended: 'danger' as 'warning',
    cancelled: 'warning',
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">
          {restaurant ? `Bienvenue, ${restaurant.name}` : 'Tableau de bord'}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {profile?.full_name || user.email}
        </p>
      </div>

      {/* No restaurant warning */}
      {!restaurant && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-yellow-400 font-semibold text-sm">
              Aucun restaurant connecté
            </p>
            <p className="text-yellow-300/60 text-xs mt-1">
              Votre compte n&apos;est pas encore lié à un restaurant.
              Contactez votre administrateur TerangaLink pour finaliser la configuration.
            </p>
          </div>
        </div>
      )}

      {/* Restaurant info card */}
      {restaurant && (
        <div className="bg-surface-50 border border-brand-orange/10 rounded-2xl p-5 mb-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-bold text-lg flex-shrink-0">
            {restaurant.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-white font-semibold">{restaurant.name}</p>
              {restaurant.is_verified && (
                <CheckCircle2 className="w-4 h-4 text-brand-orange" />
              )}
            </div>
            <p className="text-gray-500 text-sm">
              {restaurant.city || 'Dakar'}
              {restaurant.cuisine_type && ` · ${restaurant.cuisine_type}`}
            </p>
          </div>
          {subscription && (
            <Badge variant={planColors[subscription.status] ?? 'warning'}>
              {subscription.plan} · {subscription.status}
            </Badge>
          )}
        </div>
      )}

      {/* Stats */}
      <div className="stats-grid mb-8">
        <StatCard
          title="Commandes aujourd'hui"
          value="—"
          icon={<ShoppingBag className="w-5 h-5" />}
          color="orange"
          subtitle="Bientôt disponible"
        />
        <StatCard
          title="Revenus ce mois"
          value="—"
          icon={<TrendingUp className="w-5 h-5" />}
          color="green"
          subtitle="Bientôt disponible"
        />
        <StatCard
          title="Plats au menu"
          value="—"
          icon={<UtensilsCrossed className="w-5 h-5" />}
          color="blue"
          subtitle="Bientôt disponible"
        />
        <StatCard
          title="Clients fidèles"
          value="—"
          icon={<Users className="w-5 h-5" />}
          color="purple"
          subtitle="Bientôt disponible"
        />
      </div>

      {/* Quick links */}
      <Card>
        <h2 className="text-white font-semibold mb-4">Actions rapides</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            { label: 'Gérer le menu', desc: 'Ajouter / modifier vos plats', href: '/dashboard/restaurant/menu', icon: UtensilsCrossed },
            { label: 'Voir les commandes', desc: 'Commandes en cours et historique', href: '/dashboard/restaurant/orders', icon: ShoppingBag },
            { label: 'Profil du restaurant', desc: 'Modifier les informations', href: '/dashboard/restaurant/profile', icon: Users },
            { label: 'Paramètres', desc: 'Configuration du compte', href: '/dashboard/restaurant/settings', icon: TrendingUp },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 p-4 bg-surface-100 hover:bg-surface-200 border border-surface-300 rounded-xl transition-all group"
            >
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
