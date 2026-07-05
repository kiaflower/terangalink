import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, redirect } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import { ChevronRight, Truck } from 'lucide-react'
import { generateThemeTokens, DEFAULT_PRIMARY_COLOR, DEFAULT_BUTTON_COLOR } from '@/lib/theme'
import { createClient } from '@/lib/supabase/server'
import { OrderStatusLive } from './components/OrderStatusLive'

export const dynamic = 'force-dynamic'

interface OrderItem {
  name: string
  quantity: number
  price: number
  variant_name?: string
}

export async function generateMetadata({ params }: { params: { ref: string[] } }) {
  const orderRef = params.ref[params.ref.length - 1]
  return { title: `Commande ${orderRef} — TerangaLink` }
}

export default async function OrderStatusPage({ params }: { params: { ref: string[] } }) {
  const admin = createAdminClient()

  let order: Record<string, unknown> | null = null
  let restaurant: {
    id: string
    name: string
    slug: string
    logo_url: string | null
    primary_color: string | null
    background_color: string | null
    theme_mode: string | null
    button_color: string | null
  } | null = null

  if (params.ref.length === 2) {
    // Format principal : /c/[slug]/[TL-XXXXXX]
    const [slug, orderRef] = params.ref

    const { data: resto } = await admin
      .from('restaurants')
      .select('id, name, slug, logo_url, primary_color, background_color, theme_mode, button_color')
      .eq('slug', slug)
      .single()

    if (!resto) notFound()
    restaurant = resto

    const { data: ord } = await admin
      .from('orders')
      .select('*')
      .eq('restaurant_id', resto.id)
      .eq('order_number', orderRef)
      .limit(1)
      .single()

    order = ord
  } else {
    // Ancien format : /c/TL-000048 (rétrocompatibilité)
    const ref = params.ref[0]

    const { data: ord } = await admin
      .from('orders')
      .select('*')
      .eq('order_number', ref)
      .limit(1)
      .single()

    order = ord

    if (order) {
      const { data: resto } = await admin
        .from('restaurants')
        .select('id, name, slug, logo_url, primary_color, background_color, theme_mode, button_color')
        .eq('id', order.restaurant_id as string)
        .single()
      restaurant = resto
    }
  }

  if (!order || !restaurant) notFound()

  // Rediriger l'admin restaurant vers son dashboard
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, restaurant_id')
      .eq('id', user.id)
      .single()
    const isRestaurantAdmin =
      profile?.role === 'super_admin' ||
      (profile?.role === 'restaurant_admin' && profile?.restaurant_id === restaurant.id)
    if (isRestaurantAdmin) {
      redirect(`/dashboard/restaurant/orders?order=${order.id}`)
    }
  }

  // ─── Thème ───────────────────────────────────────────────
  // On applique TOUJOURS les couleurs du restaurant (primary + button)
  // même pour les plans starter. Seuls le fond personnalisé et le mode
  // clair sont réservés aux plans Pro/Premium.
  const { data: sub } = await admin
    .from('subscriptions')
    .select('plan, status')
    .eq('restaurant_id', restaurant.id)
    .single()

  const isActiveSub = sub?.status === 'active' || sub?.status === 'trial'
  const plan = sub?.plan && isActiveSub ? sub.plan : 'starter'
  const isPro = plan === 'pro' || plan === 'premium'

  const tokens = generateThemeTokens({
    // Couleur principale : toujours celle du restaurant si elle existe
    primary: restaurant.primary_color || DEFAULT_PRIMARY_COLOR,
    // Mode clair/sombre : Pro seulement, sinon dark par défaut
    mode: isPro && restaurant.theme_mode === 'light' ? 'light' : 'dark',
    // Fond personnalisé : Pro seulement
    background: isPro && restaurant.background_color ? restaurant.background_color : undefined,
    // Bouton : toujours la couleur du restaurant si elle existe
    button: restaurant.button_color || restaurant.primary_color || DEFAULT_BUTTON_COLOR,
  })

  const items = (order.items ?? []) as OrderItem[]
  const orderNumber =
    (order as { order_number?: string }).order_number || params.ref[params.ref.length - 1]

  // Avis existant
  const { data: existingReview } = await admin
    .from('reviews')
    .select('id')
    .eq('order_id', order.id as string)
    .limit(1)
    .single()

  const hasReview = !!existingReview

  const orderForLive = {
    id: order.id as string,
    status: order.status as string,
    order_number: orderNumber,
    customer_name: (order.customer_name as string) || '',
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: tokens.bgPage }}>
      {/* Header */}
      <header
        className="border-b"
        style={{ borderColor: tokens.border, backgroundColor: tokens.bgCard }}
      >
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${restaurant.slug}`} className="flex items-center gap-3">
            {restaurant.logo_url ? (
              <Image
                src={restaurant.logo_url}
                alt={restaurant.name}
                width={36}
                height={36}
                className="rounded-xl object-cover"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm"
                style={{ backgroundColor: tokens.button }}
              >
                {restaurant.name.charAt(0)}
              </div>
            )}
            <div>
              <span className="font-bold text-sm" style={{ color: tokens.textPrimary }}>
                {restaurant.name}
              </span>
              <p className="text-xs font-mono" style={{ color: tokens.textMuted }}>
                Commande {orderNumber}
              </p>
            </div>
          </Link>

          <Link
            href={`/${restaurant.slug}`}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
            style={{ backgroundColor: tokens.bgBadge, color: tokens.textSecondary }}
          >
            Commander <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <OrderStatusLive
          order={orderForLive}
          tokens={tokens}
          hasReview={hasReview}
          restaurantId={restaurant.id}
        />

        {/* Détail articles */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{ backgroundColor: tokens.bgCard, border: `1.5px solid ${tokens.border}` }}
        >
          <div className="px-5 py-4 border-b" style={{ borderColor: tokens.border }}>
            <h2 className="font-bold text-sm" style={{ color: tokens.textPrimary }}>
              Votre commande
            </h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: tokens.bgBadge, color: tokens.accent }}
                  >
                    {item.quantity}
                  </span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: tokens.textPrimary }}>
                      {item.name}
                    </p>
                    {item.variant_name && (
                      <p className="text-xs" style={{ color: tokens.textMuted }}>
                        {item.variant_name}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className="text-sm font-semibold flex-shrink-0"
                  style={{ color: tokens.accent }}
                >
                  {(item.price * item.quantity).toLocaleString('fr-SN')} FCFA
                </span>
              </div>
            ))}
            <div
              className="flex items-center justify-between pt-3 border-t font-bold"
              style={{ borderColor: tokens.border, color: tokens.textPrimary }}
            >
              <span>Total</span>
              <span style={{ color: tokens.button }}>
                {(order.total as number).toLocaleString('fr-SN')} FCFA
              </span>
            </div>
          </div>
        </div>

        {/* Notes / infos client */}
        {(order.customer_name || order.notes) && (
          <div
            className="rounded-2xl px-5 py-4 space-y-2"
            style={{ backgroundColor: tokens.bgCard, border: `1.5px solid ${tokens.border}` }}
          >
            {order.customer_name && (
              <div className="flex justify-between text-sm">
                <span style={{ color: tokens.textMuted }}>Client</span>
                <span style={{ color: tokens.textPrimary }}>{order.customer_name as string}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between text-sm">
                <span style={{ color: tokens.textMuted }}>Note</span>
                <span style={{ color: tokens.textSecondary }}>{order.notes as string}</span>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/${restaurant.slug}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm transition-opacity hover:opacity-90"
          style={{ backgroundColor: tokens.button, color: '#fff' }}
        >
          <Truck className="w-4 h-4" />
          Commander à nouveau
        </Link>
      </div>
    </div>
  )
}
