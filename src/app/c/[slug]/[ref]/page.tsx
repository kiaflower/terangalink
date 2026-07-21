import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { ChevronRight, Truck, Store } from 'lucide-react'
import { OrderStatusLive } from '@/components/tracking/OrderStatusLive'
import { getBoutiqueTheme } from '@/lib/theme'

export const dynamic = 'force-dynamic'

interface OrderItem {
  name: string
  quantity: number
  price: number
  variant_name?: string
}

interface Props {
  params: { slug: string; ref: string }
}

export async function generateMetadata({ params }: Props) {
  return { title: `Commande ${params.ref} — TerangaSpot` }
}

function isNextNavigationSignal(err: unknown): boolean {
  const digest = (err as { digest?: string } | null)?.digest
  return typeof digest === 'string' && (digest === 'NEXT_NOT_FOUND' || digest.startsWith('NEXT_REDIRECT'))
}

export default async function OrderStatusPage({ params }: Props) {
  try {
    return await renderOrderStatusPage(params)
  } catch (err) {
    if (isNextNavigationSignal(err)) throw err
    console.error('order status page error:', err)
    notFound()
  }
}

async function renderOrderStatusPage({ slug, ref }: Props['params']) {
  const admin = createAdminClient()

  const { data: boutique } = await admin
    .from('boutiques')
    .select('id, name, slug, logo_url, primary_color, theme')
    .eq('slug', slug)
    .single()

  if (!boutique) notFound()

  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('boutique_id', boutique.id)
    .single()

  const isPro = subscription?.plan === 'pro'
  const { accent: accentColor, pageBg, pageText, cardBg, cardBorder, subtleText } = getBoutiqueTheme({
    primary_color: isPro ? boutique.primary_color : undefined,
    theme: isPro ? boutique.theme : 'light',
  })

  const { data: order } = await admin
    .from('orders')
    .select('*')
    .eq('boutique_id', boutique.id)
    .eq('order_number', ref)
    .limit(1)
    .single()

  if (!order) notFound()

  // Redirect logged-in boutique admin / super admin to their dashboard
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, boutique_id')
      .eq('id', user.id)
      .single()
    const isBoutiqueAdmin =
      profile?.role === 'super_admin' ||
      (profile?.role === 'boutique_admin' && profile?.boutique_id === boutique.id)
    if (isBoutiqueAdmin) {
      redirect(`/dashboard/boutique/orders?id=${order.id}`)
    }
  }

  // Le suivi de commande client est une fonctionnalité Starter/Pro — en Free,
  // seul l'admin de la boutique (redirigé ci-dessus) peut voir la commande.
  if (subscription?.plan === 'free') notFound()

  const items = (order.items ?? []) as OrderItem[]
  const orderNumber = order.order_number || ref

  const { data: existingReview } = await admin
    .from('reviews')
    .select('id')
    .eq('order_id', order.id)
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
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: pageText }}>
      <header style={{ backgroundColor: pageBg, borderBottom: `1px solid ${cardBorder}` }}>
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <Link href={`/${boutique.slug}`} className="flex items-center gap-3">
            {boutique.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={boutique.logo_url}
                alt={boutique.name}
                className="w-9 h-9 rounded-xl object-cover"
              />
            ) : (
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${accentColor}22` }}>
                <Store className="w-5 h-5" style={{ color: accentColor }} />
              </div>
            )}
            <div>
              <span className="font-bold text-sm" style={{ color: pageText }}>{boutique.name}</span>
              <p className="text-xs font-mono" style={{ color: subtleText }}>Commande {orderNumber}</p>
            </div>
          </Link>

          <Link
            href={`/${boutique.slug}`}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-xl transition-opacity hover:opacity-80"
            style={{ backgroundColor: cardBg, color: pageText, border: `1px solid ${cardBorder}` }}
          >
            Commander <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </header>

      <div className="max-w-lg mx-auto px-4 py-8 space-y-5">
        <OrderStatusLive
          order={orderForLive}
          boutiqueId={boutique.id}
          hasReview={hasReview}
          accentColor={accentColor}
          cardBg={cardBg}
          cardBorder={cardBorder}
          pageText={pageText}
          subtleText={subtleText}
        />

        <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
          <div className="px-5 py-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
            <h2 className="font-bold text-sm" style={{ color: pageText }}>Votre commande</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}>
                    {item.quantity}
                  </span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: pageText }}>{item.name}</p>
                    {item.variant_name && (
                      <p className="text-xs" style={{ color: subtleText }}>{item.variant_name}</p>
                    )}
                  </div>
                </div>
                <span className="text-sm font-semibold flex-shrink-0" style={{ color: accentColor }}>
                  {(item.price * item.quantity).toLocaleString('fr-SN')} FCFA
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3 font-bold" style={{ borderTop: `1px solid ${cardBorder}`, color: pageText }}>
              <span>Total</span>
              <span style={{ color: accentColor }}>{(order.total as number).toLocaleString('fr-SN')} FCFA</span>
            </div>
          </div>
        </div>

        {(order.customer_name || order.notes) && (
          <div className="rounded-2xl px-5 py-4 space-y-2" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
            {order.customer_name && (
              <div className="flex justify-between text-sm">
                <span style={{ color: subtleText }}>Client</span>
                <span style={{ color: pageText }}>{order.customer_name as string}</span>
              </div>
            )}
            {order.notes && (
              <div className="flex justify-between text-sm">
                <span style={{ color: subtleText }}>Note</span>
                <span style={{ color: subtleText }}>{order.notes as string}</span>
              </div>
            )}
          </div>
        )}

        <Link
          href={`/${boutique.slug}`}
          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: accentColor }}
        >
          <Truck className="w-4 h-4" />
          Commander à nouveau
        </Link>
      </div>
    </div>
  )
}
