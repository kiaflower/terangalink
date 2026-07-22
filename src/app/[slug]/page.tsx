import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getRestaurantMetadata } from '@/lib/seo'
import { isOwnerVisit } from '@/lib/analytics/isOwnerVisit'
import { getCanonicalSiteUrl } from '@/lib/site-url'
import { buildLocalBusinessJsonLd, jsonLdScript } from '@/lib/structuredData'
import { canUseFeature, type PlanKey } from '@/lib/plans'
import RestaurantPageClient from './RestaurantPageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { slug: string }
  searchParams: { from?: string; product?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase.from('restaurants').select('name, description, cuisine_type, city, slug, cover_url, logo_url').eq('slug', params.slug).single()
  if (!data) return {}
  return getRestaurantMetadata(data, getCanonicalSiteUrl())
}

export default async function RestaurantPage({ params, searchParams }: Props) {
  const supabase = createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!restaurant) notFound()

  // Compat lien legacy `?product=<uuid>` (annuaire / stories partagés avant la
  // migration vers des pages plat dédiées) : on redirige de façon permanente
  // vers l'URL canonique pour ne pas perdre les liens déjà partagés/indexés.
  if (searchParams?.product) {
    const { data: legacyProduct } = await supabase
      .from('menu_items')
      .select('slug')
      .eq('id', searchParams.product)
      .eq('restaurant_id', restaurant.id)
      .single()
    if (legacyProduct?.slug) {
      const suffix = searchParams.from === 'annuaire' ? '?from=annuaire' : ''
      permanentRedirect(`/${restaurant.slug}/plat/${legacyProduct.slug}${suffix}`)
    }
  }

  // Track view — exclut le propriétaire qui consulte sa propre restaurant
  // (dashboard, lien "Voir mon site") pour ne pas fausser les analytics.
  if (!(await isOwnerVisit(supabase, restaurant.id))) {
    await supabase.from('analytics_events').insert({
      restaurant_id: restaurant.id,
      event_type: 'restaurant_view',
    })
  }

  // Custom colors/theme are a Pro feature — Starter always keeps TerangaLink's defaults.
  // Anonymous visitors can't read `subscriptions` under RLS (only the restaurant's own
  // admin / super-admin can), so this lookup needs the admin client — otherwise every
  // real customer visit would silently evaluate isPro as false and downgrade Pro shops.
  const admin = createAdminClient()
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('restaurant_id', restaurant.id)
    .single()
  const isPro = subscription?.plan === 'pro'
  const plan: PlanKey = subscription?.plan === 'pro' || subscription?.plan === 'free' ? subscription.plan : 'starter'
  const displayRestaurant = isPro ? restaurant : { ...restaurant, primary_color: '#F97316', theme: 'light' }

  const { data: categories } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('restaurant_id', restaurant.id)
    .eq('is_active', true)
    .order('position')

  let productsQuery = supabase
    .from('menu_items')
    .select('*, variants:product_variants(*)')
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
  // L'épinglage en tête de vitrine est une fonctionnalité Pro : si le restaurant
  // a été rétrogradée après avoir épinglé des plats, on ignore simplement
  // le flag plutôt que de forcer un nettoyage en base.
  productsQuery = isPro
    ? productsQuery.order('is_pinned', { ascending: false }).order('position')
    : productsQuery.order('position')
  const { data: products } = await productsQuery

  // Bannières promotionnelles — fonctionnalité Starter/Pro
  const { data: banners } = canUseFeature(plan, 'bannieres')
    ? await supabase
        .from('restaurant_banners')
        .select('id, text')
        .eq('restaurant_id', restaurant.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3)
    : { data: [] }

  // Avis clients — indisponible en plan Free
  const { data: reviews } = canUseFeature(plan, 'avisClients')
    ? await supabase
        .from('reviews')
        .select('id, customer_name, rating, comment, created_at')
        .eq('restaurant_id', restaurant.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const localBusinessJsonLd = restaurant.address
    ? buildLocalBusinessJsonLd({
        name: restaurant.name,
        url: `${getCanonicalSiteUrl()}/${restaurant.slug}`,
        image: restaurant.logo_url,
        telephone: restaurant.phone ?? restaurant.whatsapp_number,
        address: restaurant.address,
        city: restaurant.city,
        latitude: restaurant.latitude,
        longitude: restaurant.longitude,
      })
    : null

  return (
    <>
      {localBusinessJsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessJsonLd) }} />
      )}
      <RestaurantPageClient
        restaurant={displayRestaurant}
        categories={categories ?? []}
        products={products ?? []}
        reviews={reviews ?? []}
        fromAnnuaire={searchParams?.from === 'annuaire'}
        plan={plan}
        banners={(banners ?? []) as { id: string; text: string }[]}
      />
    </>
  )
}
