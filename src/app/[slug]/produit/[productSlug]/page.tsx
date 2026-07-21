import { createPublicClient } from '@/lib/supabase/public'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import type { Metadata } from 'next'
import { Package, ShoppingBag } from 'lucide-react'
import { getProductMetadata } from '@/lib/seo'
import { getCanonicalSiteUrl } from '@/lib/site-url'
import { getBoutiqueTheme } from '@/lib/theme'
import { formatPrice, applyDiscount } from '@/lib/utils'
import { buildProductJsonLd, buildBreadcrumbJsonLd, jsonLdScript } from '@/lib/structuredData'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { FounderBadge } from '@/components/ui/FounderBadge'
import type { ProductWithVariants } from '@/lib/types'
import { ProductOrderPanel } from './ProductOrderPanel'
import { ProductPageHeaderLinks } from './ProductPageHeaderLinks'
import { BoutiqueLink } from './BoutiqueLink'
import { VariantSelectionProvider } from './VariantSelectionContext'
import { ConnectedProductGallery } from './ConnectedProductGallery'
import { ScrollableDescription } from '@/components/product/ScrollableDescription'

export const revalidate = 300

interface Props {
  params: { slug: string; productSlug: string }
}

const BOUTIQUE_SELECT = 'id, slug, name, logo_url, cover_url, city, shop_category, whatsapp_number, is_verified, is_founder, primary_color, theme'

async function getData(boutiqueSlug: string, productSlug: string) {
  const supabase = createPublicClient()

  const { data: boutique } = await supabase
    .from('boutiques')
    .select(BOUTIQUE_SELECT)
    .eq('slug', boutiqueSlug)
    .single()

  if (!boutique) return null

  const { data: product } = await supabase
    .from('products')
    .select('*, variants:product_variants(*), product_categories(name)')
    .eq('boutique_id', boutique.id)
    .eq('slug', productSlug)
    .single()

  if (!product) return null

  // L'épinglage en tête de vitrine est une fonctionnalité Pro (cf. [slug]/page.tsx) ;
  // anon ne peut pas lire `subscriptions` sous RLS, d'où le client admin ici.
  const { data: subscription } = await createAdminClient()
    .from('subscriptions')
    .select('plan')
    .eq('boutique_id', boutique.id)
    .single()
  const isPro = subscription?.plan === 'pro'

  let otherProductsQuery = supabase
    .from('products')
    .select('id, slug, name, price, discount_percent, image_url')
    .eq('boutique_id', boutique.id)
    .eq('is_available', true)
    .neq('id', product.id)
  otherProductsQuery = isPro
    ? otherProductsQuery.order('is_pinned', { ascending: false }).order('position')
    : otherProductsQuery.order('position')

  const [{ data: otherProducts }, { data: similarProducts }] = await Promise.all([
    otherProductsQuery.limit(6),
    boutique.shop_category
      ? supabase
          .from('products')
          .select('id, slug, name, price, discount_percent, image_url, boutiques!inner(slug, name, is_active, is_demo, shop_category)')
          .eq('is_available', true)
          .eq('boutiques.shop_category', boutique.shop_category)
          .eq('boutiques.is_active', true)
          .eq('boutiques.is_demo', false)
          .neq('boutique_id', boutique.id)
          .limit(6)
      : Promise.resolve({ data: [] }),
  ])

  return { boutique, product: product as ProductWithVariants & { product_categories: { name: string } | null }, otherProducts: otherProducts ?? [], similarProducts: (similarProducts ?? []) as unknown as SimilarProduct[] }
}

interface SimilarProduct {
  id: string
  slug: string
  name: string
  price: number
  discount_percent: number | null
  image_url: string | null
  boutiques: { slug: string; name: string; is_active: boolean; is_demo: boolean; shop_category: string | null } | { slug: string; name: string; is_active: boolean; is_demo: boolean; shop_category: string | null }[]
}

function normalizeBoutiqueRel<T>(b: T | T[]): T {
  return Array.isArray(b) ? b[0] : b
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getData(params.slug, params.productSlug)
  if (!data) return {}
  return getProductMetadata(data.product, data.boutique, params.productSlug, getCanonicalSiteUrl())
}

export default async function ProductPage({ params }: Props) {
  const data = await getData(params.slug, params.productSlug)
  if (!data) notFound()
  const { boutique, product, otherProducts, similarProducts } = data

  const siteUrl = getCanonicalSiteUrl()
  const productUrl = `${siteUrl}/${boutique.slug}/produit/${params.productSlug}`
  const { accent, pageBg, pageText, cardBg, cardBorder, subtleText } = getBoutiqueTheme(boutique)

  const images = product.images_urls?.length ? product.images_urls : (product.image_url ? [product.image_url] : [])
  const inStock = product.is_available && (!product.track_stock || (product.stock_quantity ?? 0) > 0)
  const displayPrice = applyDiscount(product.price, product.discount_percent)

  const categoryLabel = boutique.shop_category ?? 'Boutique'
  const categoryHref = `/boutiques?category=${encodeURIComponent(categoryLabel)}`

  const breadcrumbItems = [
    { name: 'Accueil', url: `${siteUrl}/` },
    { name: 'Boutiques', url: `${siteUrl}/boutiques` },
    { name: categoryLabel, url: `${siteUrl}${categoryHref}` },
    { name: boutique.name, url: `${siteUrl}/${boutique.slug}` },
    { name: product.name, url: productUrl },
  ]

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description: product.description ?? `${product.name} disponible chez ${boutique.name} à ${boutique.city ?? 'Dakar'}.`,
    images: images.length ? images : (boutique.logo_url ? [boutique.logo_url] : []),
    boutiqueName: boutique.name,
    price: displayPrice,
    url: productUrl,
    inStock,
  })

  const breadcrumbJsonLd = buildBreadcrumbJsonLd(breadcrumbItems)

  return (
    <div className="min-h-screen" style={{ backgroundColor: pageBg, color: pageText }}>
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd) }} />
      {/* eslint-disable-next-line react/no-danger */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd) }} />

      <header className="sticky top-0 z-40" style={{ borderBottom: `1px solid ${cardBorder}`, backgroundColor: pageBg }}>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
          <Suspense fallback={
            <Link href={`/${boutique.slug}`} className="flex items-center gap-2.5 min-w-0">
              {boutique.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={boutique.logo_url} alt={boutique.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: accent }}>
                  {boutique.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate" style={{ color: pageText }}>{boutique.name}</p>
                {boutique.shop_category && (
                  <p className="text-[10px] uppercase tracking-wider truncate" style={{ color: subtleText }}>{boutique.shop_category}</p>
                )}
              </div>
            </Link>
          }>
            <ProductPageHeaderLinks boutique={boutique} accent={accent} pageText={pageText} subtleText={subtleText} />
          </Suspense>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-16">
        <VariantSelectionProvider>
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:gap-12">
          <div>
            <ConnectedProductGallery
              images={images}
              videoUrl={product.video_url}
              productName={product.name}
              cardBg={cardBg}
              variants={product.variants}
            />
          </div>

          <div>
            <Suspense fallback={
              <Link href={`/${boutique.slug}`} className="inline-flex items-center gap-2 mb-3 group">
                {boutique.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={boutique.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                    {boutique.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium group-hover:underline" style={{ color: subtleText }}>{boutique.name}</span>
                {boutique.is_founder ? <FounderBadge label="" /> : boutique.is_verified ? <VerifiedBadge label="" className="text-gray-500" /> : null}
              </Link>
            }>
              <BoutiqueLink slug={boutique.slug} className="inline-flex items-center gap-2 mb-3 group">
                {boutique.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={boutique.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                    {boutique.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium group-hover:underline" style={{ color: subtleText }}>{boutique.name}</span>
                {boutique.is_founder ? <FounderBadge label="" /> : boutique.is_verified ? <VerifiedBadge label="" className="text-gray-500" /> : null}
              </BoutiqueLink>
            </Suspense>

            <h1 className="text-2xl sm:text-3xl font-black leading-tight">{product.name}</h1>

            {product.product_categories?.name && (
              <p className="text-xs uppercase tracking-wide font-semibold mt-1" style={{ color: subtleText }}>{product.product_categories.name}</p>
            )}

            {product.description && (
              <ScrollableDescription text={product.description} textColor={subtleText} bgColor={pageBg} />
            )}

            <ProductOrderPanel
              product={product}
              boutiqueId={boutique.id}
              boutiqueSlug={boutique.slug}
              boutiqueName={boutique.name}
              whatsappNumber={boutique.whatsapp_number}
              accent={accent}
            />
          </div>
        </div>
        </VariantSelectionProvider>

        {otherProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-lg font-bold mb-5">Autres articles de {boutique.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {otherProducts.map(p => (
                <Link key={p.id} href={`/${boutique.slug}/produit/${p.slug}`}
                  className="rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                  style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
                  <div className="aspect-square relative bg-gray-50">
                    {p.image_url ? (
                      <Image src={p.image_url} alt={p.name} fill sizes="200px" className="object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold truncate">{p.name}</p>
                    <p className="text-xs font-bold mt-0.5" style={{ color: accent }}>{formatPrice(applyDiscount(p.price, p.discount_percent))}</p>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {similarProducts.length > 0 && (
          <section className="mt-12">
            <h2 className="text-lg font-bold mb-5">Produits similaires dans {categoryLabel}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarProducts.map(p => {
                const b = normalizeBoutiqueRel(p.boutiques)
                return (
                  <Link key={p.id} href={`/${b.slug}/produit/${p.slug}`}
                    className="rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                    style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
                    <div className="aspect-square relative bg-gray-50">
                      {p.image_url ? (
                        <Image src={p.image_url} alt={p.name} fill sizes="200px" className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-300" /></div>
                      )}
                    </div>
                    <div className="p-2.5">
                      <p className="text-xs font-semibold truncate">{p.name}</p>
                      <p className="text-xs font-bold mt-0.5" style={{ color: accent }}>{formatPrice(applyDiscount(p.price, p.discount_percent))}</p>
                      <p className="text-[10px] truncate mt-0.5" style={{ color: subtleText }}>{b.name}</p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </section>
        )}

        <div className="mt-12 text-center">
          <Suspense fallback={
            <Link href={`/${boutique.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
              <ShoppingBag className="w-4 h-4" />
              Voir tout le catalogue de {boutique.name}
            </Link>
          }>
            <BoutiqueLink slug={boutique.slug}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
              <ShoppingBag className="w-4 h-4" />
              Voir tout le catalogue de {boutique.name}
            </BoutiqueLink>
          </Suspense>
        </div>
      </main>
    </div>
  )
}
