import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound, permanentRedirect } from 'next/navigation'
import type { Metadata } from 'next'
import { getBoutiqueMetadata } from '@/lib/seo'
import { isOwnerVisit } from '@/lib/analytics/isOwnerVisit'
import { getCanonicalSiteUrl } from '@/lib/site-url'
import { buildLocalBusinessJsonLd, jsonLdScript } from '@/lib/structuredData'
import { canUseFeature, type PlanKey } from '@/lib/plans'
import BoutiquePageClient from './BoutiquePageClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  params: { slug: string }
  searchParams: { from?: string; product?: string }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = createClient()
  const { data } = await supabase.from('boutiques').select('name, description, shop_category, city, slug, cover_url, logo_url').eq('slug', params.slug).single()
  if (!data) return {}
  return getBoutiqueMetadata(data, getCanonicalSiteUrl())
}

export default async function BoutiquePage({ params, searchParams }: Props) {
  const supabase = createClient()

  const { data: boutique } = await supabase
    .from('boutiques')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!boutique) notFound()

  // Compat lien legacy `?product=<uuid>` (annuaire / stories partagés avant la
  // migration vers des pages produit dédiées) : on redirige de façon permanente
  // vers l'URL canonique pour ne pas perdre les liens déjà partagés/indexés.
  if (searchParams?.product) {
    const { data: legacyProduct } = await supabase
      .from('products')
      .select('slug')
      .eq('id', searchParams.product)
      .eq('boutique_id', boutique.id)
      .single()
    if (legacyProduct?.slug) {
      const suffix = searchParams.from === 'annuaire' ? '?from=annuaire' : ''
      permanentRedirect(`/${boutique.slug}/produit/${legacyProduct.slug}${suffix}`)
    }
  }

  // Track view — exclut le propriétaire qui consulte sa propre boutique
  // (dashboard, lien "Voir mon site") pour ne pas fausser les analytics.
  if (!(await isOwnerVisit(supabase, boutique.id))) {
    await supabase.from('analytics_events').insert({
      boutique_id: boutique.id,
      event_type: 'boutique_view',
    })
  }

  // Custom colors/theme are a Pro feature — Starter always keeps TerangaSpot's defaults.
  // Anonymous visitors can't read `subscriptions` under RLS (only the boutique's own
  // admin / super-admin can), so this lookup needs the admin client — otherwise every
  // real customer visit would silently evaluate isPro as false and downgrade Pro shops.
  const admin = createAdminClient()
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('boutique_id', boutique.id)
    .single()
  const isPro = subscription?.plan === 'pro'
  const plan: PlanKey = subscription?.plan === 'pro' || subscription?.plan === 'free' ? subscription.plan : 'starter'
  const displayBoutique = isPro ? boutique : { ...boutique, primary_color: '#7C3AED', theme: 'light' }

  const { data: categories } = await supabase
    .from('product_categories')
    .select('*')
    .eq('boutique_id', boutique.id)
    .eq('is_active', true)
    .order('position')

  let productsQuery = supabase
    .from('products')
    .select('*, variants:product_variants(*)')
    .eq('boutique_id', boutique.id)
    .eq('is_available', true)
  // L'épinglage en tête de vitrine est une fonctionnalité Pro : si la boutique
  // a été rétrogradée après avoir épinglé des produits, on ignore simplement
  // le flag plutôt que de forcer un nettoyage en base.
  productsQuery = isPro
    ? productsQuery.order('is_pinned', { ascending: false }).order('position')
    : productsQuery.order('position')
  const { data: products } = await productsQuery

  // Bannières promotionnelles — fonctionnalité Starter/Pro
  const { data: banners } = canUseFeature(plan, 'bannieres')
    ? await supabase
        .from('boutique_banners')
        .select('id, text')
        .eq('boutique_id', boutique.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(3)
    : { data: [] }

  // Avis clients — indisponible en plan Free
  const { data: reviews } = canUseFeature(plan, 'avisClients')
    ? await supabase
        .from('reviews')
        .select('id, customer_name, rating, comment, created_at')
        .eq('boutique_id', boutique.id)
        .eq('is_visible', true)
        .order('created_at', { ascending: false })
        .limit(20)
    : { data: [] }

  const localBusinessJsonLd = boutique.address
    ? buildLocalBusinessJsonLd({
        name: boutique.name,
        url: `${getCanonicalSiteUrl()}/${boutique.slug}`,
        image: boutique.logo_url,
        telephone: boutique.phone ?? boutique.whatsapp_number,
        address: boutique.address,
        city: boutique.city,
        latitude: boutique.latitude,
        longitude: boutique.longitude,
      })
    : null

  return (
    <>
      {localBusinessJsonLd && (
        // eslint-disable-next-line react/no-danger
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(localBusinessJsonLd) }} />
      )}
      <BoutiquePageClient
        boutique={displayBoutique}
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
