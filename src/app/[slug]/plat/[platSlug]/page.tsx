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
import { getRestaurantTheme } from '@/lib/theme'
import { formatPrice, applyDiscount } from '@/lib/utils'
import { buildProductJsonLd, buildBreadcrumbJsonLd, jsonLdScript } from '@/lib/structuredData'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { FounderBadge } from '@/components/ui/FounderBadge'
import type { ProductWithVariants } from '@/lib/types'
import { ProductOrderPanel } from './ProductOrderPanel'
import { ProductPageHeaderLinks } from './ProductPageHeaderLinks'
import { RestaurantLink } from './RestaurantLink'
import { VariantSelectionProvider } from './VariantSelectionContext'
import { ConnectedProductGallery } from './ConnectedProductGallery'
import { ScrollableDescription } from '@/components/product/ScrollableDescription'

export const revalidate = 300

interface Props {
  params: { slug: string; platSlug: string }
}

const RESTAURANT_SELECT = 'id, slug, name, logo_url, cover_url, city, cuisine_type, whatsapp_number, is_verified, is_founder, primary_color, theme'

async function getData(restaurantSlug: string, platSlug: string) {
  const supabase = createPublicClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select(RESTAURANT_SELECT)
    .eq('slug', restaurantSlug)
    .single()

  if (!restaurant) return null

  const { data: product } = await supabase
    .from('menu_items')
    .select('*, variants:menu_item_variants(*), menu_categories(name)')
    .eq('restaurant_id', restaurant.id)
    .eq('slug', platSlug)
    .single()

  if (!product) return null

  // L'épinglage en tête de vitrine est une fonctionnalité Pro (cf. [slug]/page.tsx) ;
  // anon ne peut pas lire `subscriptions` sous RLS, d'où le client admin ici.
  const { data: subscription } = await createAdminClient()
    .from('subscriptions')
    .select('plan')
    .eq('restaurant_id', restaurant.id)
    .single()
  const isPro = subscription?.plan === 'pro'

  let otherProductsQuery = supabase
    .from('menu_items')
    .select('id, slug, name, price, discount_percent, image_url')
    .eq('restaurant_id', restaurant.id)
    .eq('is_available', true)
    .neq('id', product.id)
  otherProductsQuery = isPro
    ? otherProductsQuery.order('is_pinned', { ascending: false }).order('position')
    : otherProductsQuery.order('position')

  const [{ data: otherProducts }, { data: similarProducts }] = await Promise.all([
    otherProductsQuery.limit(6),
    restaurant.cuisine_type
      ? supabase
          .from('menu_items')
          .select('id, slug, name, price, discount_percent, image_url, restaurants!inner(slug, name, is_active, is_demo, cuisine_type)')
          .eq('is_available', true)
          .eq('restaurants.cuisine_type', restaurant.cuisine_type)
          .eq('restaurants.is_active', true)
          .eq('restaurants.is_demo', false)
          .neq('restaurant_id', restaurant.id)
          .limit(6)
      : Promise.resolve({ data: [] }),
  ])

  return { restaurant, product: product as ProductWithVariants & { menu_categories: { name: string } | null }, otherProducts: otherProducts ?? [], similarProducts: (similarProducts ?? []) as unknown as SimilarProduct[] }
}

interface SimilarProduct {
  id: string
  slug: string
  name: string
  price: number
  discount_percent: number | null
  image_url: string | null
  restaurants: { slug: string; name: string; is_active: boolean; is_demo: boolean; cuisine_type: string | null } | { slug: string; name: string; is_active: boolean; is_demo: boolean; cuisine_type: string | null }[]
}

function normalizeRestaurantRel<T>(b: T | T[]): T {
  return Array.isArray(b) ? b[0] : b
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await getData(params.slug, params.platSlug)
  if (!data) return {}
  return getProductMetadata(data.product, data.restaurant, params.platSlug, getCanonicalSiteUrl())
}

export default async function ProductPage({ params }: Props) {
  const data = await getData(params.slug, params.platSlug)
  if (!data) notFound()
  const { restaurant, product, otherProducts, similarProducts } = data

  const siteUrl = getCanonicalSiteUrl()
  const productUrl = `${siteUrl}/${restaurant.slug}/plat/${params.platSlug}`
  const { accent, pageBg, pageText, cardBg, cardBorder, subtleText } = getRestaurantTheme(restaurant)

  const images = product.images_urls?.length ? product.images_urls : (product.image_url ? [product.image_url] : [])
  const inStock = product.is_available && (!product.track_stock || (product.stock_quantity ?? 0) > 0)
  const displayPrice = applyDiscount(product.price, product.discount_percent)

  const categoryLabel = restaurant.cuisine_type ?? 'Restaurant'
  const categoryHref = `/restaurants?category=${encodeURIComponent(categoryLabel)}`

  const breadcrumbItems = [
    { name: 'Accueil', url: `${siteUrl}/` },
    { name: 'Restaurants', url: `${siteUrl}/restaurants` },
    { name: categoryLabel, url: `${siteUrl}${categoryHref}` },
    { name: restaurant.name, url: `${siteUrl}/${restaurant.slug}` },
    { name: product.name, url: productUrl },
  ]

  const productJsonLd = buildProductJsonLd({
    name: product.name,
    description: product.description ?? `${product.name} disponible chez ${restaurant.name} à ${restaurant.city ?? 'Dakar'}.`,
    images: images.length ? images : (restaurant.logo_url ? [restaurant.logo_url] : []),
    restaurantName: restaurant.name,
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
            <Link href={`/${restaurant.slug}`} className="flex items-center gap-2.5 min-w-0">
              {restaurant.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={restaurant.logo_url} alt={restaurant.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
              ) : (
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: accent }}>
                  {restaurant.name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="font-bold text-sm leading-tight truncate" style={{ color: pageText }}>{restaurant.name}</p>
                {restaurant.cuisine_type && (
                  <p className="text-[10px] uppercase tracking-wider truncate" style={{ color: subtleText }}>{restaurant.cuisine_type}</p>
                )}
              </div>
            </Link>
          }>
            <ProductPageHeaderLinks restaurant={restaurant} accent={accent} pageText={pageText} subtleText={subtleText} />
          </Suspense>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-5 pb-16">
        <VariantSelectionProvider>
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-8 md:gap-12">
          <div>
            <ConnectedProductGallery
              images={images}
              productName={product.name}
              cardBg={cardBg}
              variants={product.variants}
            />
          </div>

          <div>
            <Suspense fallback={
              <Link href={`/${restaurant.slug}`} className="inline-flex items-center gap-2 mb-3 group">
                {restaurant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurant.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                    {restaurant.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium group-hover:underline" style={{ color: subtleText }}>{restaurant.name}</span>
                {restaurant.is_founder ? <FounderBadge label="" /> : restaurant.is_verified ? <VerifiedBadge label="" className="text-gray-500" /> : null}
              </Link>
            }>
              <RestaurantLink slug={restaurant.slug} className="inline-flex items-center gap-2 mb-3 group">
                {restaurant.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={restaurant.logo_url} alt="" className="w-6 h-6 rounded-md object-cover" />
                ) : (
                  <div className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: accent }}>
                    {restaurant.name.charAt(0)}
                  </div>
                )}
                <span className="text-sm font-medium group-hover:underline" style={{ color: subtleText }}>{restaurant.name}</span>
                {restaurant.is_founder ? <FounderBadge label="" /> : restaurant.is_verified ? <VerifiedBadge label="" className="text-gray-500" /> : null}
              </RestaurantLink>
            </Suspense>

            <h1 className="text-2xl sm:text-3xl font-black leading-tight">{product.name}</h1>

            {product.menu_categories?.name && (
              <p className="text-xs uppercase tracking-wide font-semibold mt-1" style={{ color: subtleText }}>{product.menu_categories.name}</p>
            )}

            {product.description && (
              <ScrollableDescription text={product.description} textColor={subtleText} bgColor={pageBg} />
            )}

            <ProductOrderPanel
              product={product}
              restaurantId={restaurant.id}
              restaurantSlug={restaurant.slug}
              restaurantName={restaurant.name}
              whatsappNumber={restaurant.whatsapp_number}
              accent={accent}
            />
          </div>
        </div>
        </VariantSelectionProvider>

        {otherProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-lg font-bold mb-5">Autres plats de {restaurant.name}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {otherProducts.map(p => (
                <Link key={p.id} href={`/${restaurant.slug}/plat/${p.slug}`}
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
            <h2 className="text-lg font-bold mb-5">Plats similaires dans {categoryLabel}</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {similarProducts.map(p => {
                const b = normalizeRestaurantRel(p.restaurants)
                return (
                  <Link key={p.id} href={`/${b.slug}/plat/${p.slug}`}
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
            <Link href={`/${restaurant.slug}`}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
              <ShoppingBag className="w-4 h-4" />
              Voir tout le menu de {restaurant.name}
            </Link>
          }>
            <RestaurantLink slug={restaurant.slug}
              className="inline-flex items-center gap-2 text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
              style={{ border: `1px solid ${cardBorder}`, color: pageText }}>
              <ShoppingBag className="w-4 h-4" />
              Voir tout le menu de {restaurant.name}
            </RestaurantLink>
          </Suspense>
        </div>
      </main>
    </div>
  )
}
