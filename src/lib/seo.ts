export const DEFAULT_SEO = {
  siteName: 'TerangaLink',
  title: 'TerangaLink — Achetez et vendez au Sénégal via WhatsApp',
  description:
    'Découvrez les meilleurs restaurants du Sénégal. Mode, beauté, artisanat et plus — commandez directement via WhatsApp, sans appli.',
  url: 'https://teranga-link.com',
  locale: 'fr_SN',
  keywords:
    'restaurant en ligne Dakar, vente WhatsApp Sénégal, commerce local Sénégal, mode Dakar, beauté Sénégal, TerangaLink',
}

// Route générée par src/app/opengraph-image.tsx (1200x630, PNG, marque TerangaLink) —
// sert de filet de sécurité quand un restaurant/un plat n'a aucune photo. Sans ça,
// og:image serait absent et les crawlers (surtout iMessage, contrairement à Facebook
// qui tolère mieux) retombent sur une mini-icône au lieu d'un grand aperçu.
function defaultOgImageUrl(siteUrl: string): string {
  return `${siteUrl}/opengraph-image`
}

const SUPABASE_STORAGE_MARKER = '/storage/v1/object/public/'

// Les photos envoyées par les restaurants (souvent des photos de téléphone brutes,
// parfois plusieurs Mo, en PNG sans perte que Supabase ne peut pas recompresser)
// passent par /api/og-image, qui les retélécharge une fois et les réencode en
// JPEG 1200x630 avec sharp. WhatsApp est bien plus strict que le débogueur
// Facebook et peut abandonner silencieusement l'aperçu sur un fichier trop lourd.
function toOgImageUrl(url: string, siteUrl: string): string {
  const idx = url.indexOf(SUPABASE_STORAGE_MARKER)
  if (idx === -1) return url
  const path = url.slice(idx + SUPABASE_STORAGE_MARKER.length)
  return `${siteUrl}/api/og-image?path=${encodeURIComponent(path)}`
}

interface OgImage {
  url: string
  alt: string
  width?: number
  height?: number
}

// width/height ne sont indiqués que quand on connaît vraiment les dimensions
// finales : soit l'image de fallback (1200x630 fixe), soit une photo restaurant/
// plat passée par toOgImageUrl (réencodée à 1200x630 par /api/og-image). Une
// image externe non hébergée sur Supabase resterait dans ses dimensions
// d'origine — annoncer 1200x630 dans ce cas serait une métadonnée fausse.
function buildOgImage(rawUrl: string | null | undefined, fallbackUrl: string, alt: string, siteUrl: string): OgImage {
  // Certaines restaurants (créées/éditées via l'assistant super-admin) ont un
  // cover_url/logo_url en data: URI base64 plutôt qu'une vraie URL Storage —
  // un data: URI n'est pas une URL absolue valide pour og:image (les crawlers
  // l'ignorent ou échouent), donc on retombe sur le visuel par défaut.
  if (!rawUrl || rawUrl.startsWith('data:')) return { url: fallbackUrl, alt, width: 1200, height: 630 }
  const url = toOgImageUrl(rawUrl, siteUrl)
  return url === rawUrl ? { url, alt } : { url, alt, width: 1200, height: 630 }
}

export function getRestaurantMetadata(restaurant: {
  name: string
  description?: string | null
  cuisine_type?: string | null
  city?: string | null
  slug: string
  cover_url?: string | null
  logo_url?: string | null
}, siteUrl: string = DEFAULT_SEO.url) {
  const title = `${restaurant.name} — ${restaurant.cuisine_type ?? 'Restaurant'} à ${restaurant.city ?? 'Dakar'} | TerangaLink`
  const description =
    restaurant.description ??
    `Découvrez ${restaurant.name}, ${restaurant.cuisine_type ?? 'restaurant'} à ${restaurant.city ?? 'Dakar'}. Commandez via WhatsApp sur TerangaLink.`
  const rawImage = restaurant.cover_url ?? restaurant.logo_url
  const image = buildOgImage(rawImage, defaultOgImageUrl(siteUrl), restaurant.name, siteUrl)
  const url = `${siteUrl}/${restaurant.slug}`

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: DEFAULT_SEO.siteName,
      locale: DEFAULT_SEO.locale,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image.url],
    },
  }
}

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 1).trimEnd() + '…'
}

export function getProductMetadata(product: {
  name: string
  description?: string | null
  price: number
  image_url?: string | null
  is_available: boolean
}, restaurant: {
  name: string
  city?: string | null
  slug: string
  cover_url?: string | null
  logo_url?: string | null
}, platSlug: string, siteUrl: string = DEFAULT_SEO.url) {
  const city = restaurant.city ?? 'Dakar'
  const url = `${siteUrl}/${restaurant.slug}/plat/${platSlug}`
  const title = `${product.name} – ${restaurant.name} à ${city} | TerangaLink`
  const description = truncate(
    product.description
      ? product.description
      : `${product.name} disponible chez ${restaurant.name} à ${city}. Prix : ${formatPrice(product.price)}. Commandez directement sur WhatsApp.`,
    155
  )
  // Priorité : photo du plat > couverture restaurant > logo restaurant > visuel par défaut.
  const rawImage = product.image_url ?? restaurant.cover_url ?? restaurant.logo_url
  const image = buildOgImage(rawImage, defaultOgImageUrl(siteUrl), product.name, siteUrl)

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: product.is_available ? { index: true, follow: true } : { index: false, follow: true },
    openGraph: {
      title,
      description,
      url,
      siteName: DEFAULT_SEO.siteName,
      locale: DEFAULT_SEO.locale,
      type: 'website',
      images: [image],
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
      images: [image.url],
    },
  }
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-SN').format(price) + ' FCFA'
}
