export const DEFAULT_SEO = {
  siteName: 'TerangaSpot',
  title: 'TerangaSpot — Achetez et vendez au Sénégal via WhatsApp',
  description:
    'Découvrez les meilleures boutiques du Sénégal. Mode, beauté, artisanat et plus — commandez directement via WhatsApp, sans appli.',
  url: 'https://teranga-spot.com',
  locale: 'fr_SN',
  keywords:
    'boutique en ligne Dakar, vente WhatsApp Sénégal, commerce local Sénégal, mode Dakar, beauté Sénégal, TerangaSpot',
}

// Route générée par src/app/opengraph-image.tsx (1200x630, PNG, marque TerangaSpot) —
// sert de filet de sécurité quand une boutique/un produit n'a aucune photo. Sans ça,
// og:image serait absent et les crawlers (surtout iMessage, contrairement à Facebook
// qui tolère mieux) retombent sur une mini-icône au lieu d'un grand aperçu.
function defaultOgImageUrl(siteUrl: string): string {
  return `${siteUrl}/opengraph-image`
}

const SUPABASE_STORAGE_MARKER = '/storage/v1/object/public/'

// Les photos envoyées par les boutiques (souvent des photos de téléphone brutes,
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
// finales : soit l'image de fallback (1200x630 fixe), soit une photo boutique/
// produit passée par toOgImageUrl (réencodée à 1200x630 par /api/og-image). Une
// image externe non hébergée sur Supabase resterait dans ses dimensions
// d'origine — annoncer 1200x630 dans ce cas serait une métadonnée fausse.
function buildOgImage(rawUrl: string | null | undefined, fallbackUrl: string, alt: string, siteUrl: string): OgImage {
  // Certaines boutiques (créées/éditées via l'assistant super-admin) ont un
  // cover_url/logo_url en data: URI base64 plutôt qu'une vraie URL Storage —
  // un data: URI n'est pas une URL absolue valide pour og:image (les crawlers
  // l'ignorent ou échouent), donc on retombe sur le visuel par défaut.
  if (!rawUrl || rawUrl.startsWith('data:')) return { url: fallbackUrl, alt, width: 1200, height: 630 }
  const url = toOgImageUrl(rawUrl, siteUrl)
  return url === rawUrl ? { url, alt } : { url, alt, width: 1200, height: 630 }
}

export function getBoutiqueMetadata(boutique: {
  name: string
  description?: string | null
  shop_category?: string | null
  city?: string | null
  slug: string
  cover_url?: string | null
  logo_url?: string | null
}, siteUrl: string = DEFAULT_SEO.url) {
  const title = `${boutique.name} — ${boutique.shop_category ?? 'Boutique'} à ${boutique.city ?? 'Dakar'} | TerangaSpot`
  const description =
    boutique.description ??
    `Découvrez ${boutique.name}, ${boutique.shop_category ?? 'boutique'} à ${boutique.city ?? 'Dakar'}. Commandez via WhatsApp sur TerangaSpot.`
  const rawImage = boutique.cover_url ?? boutique.logo_url
  const image = buildOgImage(rawImage, defaultOgImageUrl(siteUrl), boutique.name, siteUrl)
  const url = `${siteUrl}/${boutique.slug}`

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
}, boutique: {
  name: string
  city?: string | null
  slug: string
  cover_url?: string | null
  logo_url?: string | null
}, productSlug: string, siteUrl: string = DEFAULT_SEO.url) {
  const city = boutique.city ?? 'Dakar'
  const url = `${siteUrl}/${boutique.slug}/produit/${productSlug}`
  const title = `${product.name} – ${boutique.name} à ${city} | TerangaSpot`
  const description = truncate(
    product.description
      ? product.description
      : `${product.name} disponible chez ${boutique.name} à ${city}. Prix : ${formatPrice(product.price)}. Commandez directement sur WhatsApp.`,
    155
  )
  // Priorité : photo du produit > couverture boutique > logo boutique > visuel par défaut.
  const rawImage = product.image_url ?? boutique.cover_url ?? boutique.logo_url
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
