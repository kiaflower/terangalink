export const SITE_NAME = 'TerangaLink'
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teranga-link.com'

export interface SeoRestaurantData {
  name: string
  slug: string
  description: string | null
  city: string | null
  address: string | null
  cuisine_type: string | null
  phone: string | null
  whatsapp_number: string | null
  logo_url: string | null
  cover_url: string | null
  latitude: number | null
  longitude: number | null
  opening_hours: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  topCategories?: string[]
  topItems?: string[]
}

export function buildAutoDescription(data: SeoRestaurantData): string {
  const parts: string[] = []
  const menuHints = [
    ...(data.topItems ?? []).slice(0, 3),
    ...(data.topCategories ?? []).slice(0, 2),
  ].filter(Boolean)

  if (menuHints.length > 0) {
    parts.push(`Commandez ${menuHints.join(', ')}`)
  } else if (data.cuisine_type) {
    parts.push(`Cuisine ${data.cuisine_type}`)
  } else {
    parts.push(`Commandez en ligne`)
  }

  if (data.city) parts.push(`à ${data.city}`)
  parts.push(`via WhatsApp sur ${SITE_NAME}`)

  const full = `${data.name} — ${parts.join(' ')}.`
  return full.length > 160 ? full.slice(0, 157) + '…' : full
}

export function buildTitle(data: Pick<SeoRestaurantData, 'name' | 'city' | 'cuisine_type'>): string {
  const parts = [data.name]
  if (data.cuisine_type) parts.push(data.cuisine_type)
  if (data.city) parts.push(data.city)
  return parts.join(' · ')
}

export function buildKeywords(data: SeoRestaurantData): string {
  const kw: string[] = [
    data.name,
    `restaurant ${data.city ?? ''}`.trim(),
    `commande en ligne ${data.city ?? ''}`.trim(),
    `livraison ${data.city ?? ''}`.trim(),
  ]
  if (data.cuisine_type) kw.push(data.cuisine_type, `cuisine ${data.cuisine_type}`)
  if (data.topCategories) kw.push(...data.topCategories.slice(0, 4))
  if (data.topItems) kw.push(...data.topItems.slice(0, 4))
  kw.push('TerangaLink', 'WhatsApp commande', 'menu en ligne')
  return [...new Set(kw)].filter(Boolean).join(', ')
}

export function buildOgImageUrl(slug: string): string {
  return `${SITE_URL}/${slug}/opengraph-image`
}

export function buildCanonical(slug: string): string {
  return `${SITE_URL}/${slug}`
}

const DAYS_FR_TO_SCHEMA: Record<string, string> = {
  lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday',
  jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday',
}

export function buildSchemaOrg(data: SeoRestaurantData): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'LocalBusiness'],
    name: data.name,
    url: buildCanonical(data.slug),
  }

  if (data.description) schema.description = data.description
  if (data.cuisine_type) schema.servesCuisine = data.cuisine_type

  const image = data.cover_url ?? data.logo_url ?? `${SITE_URL}/logo-terangalink.jpg`
  schema.image = image
  if (data.logo_url) schema.logo = data.logo_url

  if (data.address || data.city) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(data.address ? { streetAddress: data.address } : {}),
      ...(data.city ? { addressLocality: data.city } : {}),
      addressCountry: 'SN',
    }
  }

  const tel = data.whatsapp_number ?? data.phone
  if (tel) schema.telephone = tel

  if (data.latitude && data.longitude) {
    schema.geo = { '@type': 'GeoCoordinates', latitude: data.latitude, longitude: data.longitude }
  }

  if (data.opening_hours) {
    const hours: string[] = []
    for (const [dayFr, slot] of Object.entries(data.opening_hours)) {
      if (slot.ferme) continue
      const dayEn = DAYS_FR_TO_SCHEMA[dayFr.toLowerCase()]
      if (!dayEn) continue
      if (slot.ouverture && slot.fermeture) hours.push(`${dayEn} ${slot.ouverture}-${slot.fermeture}`)
    }
    if (hours.length > 0) schema.openingHours = hours
  }

  const sameAs: string[] = []
  if (data.facebook_url) sameAs.push(data.facebook_url)
  if (data.instagram_url) sameAs.push(data.instagram_url)
  if (data.tiktok_url) sameAs.push(data.tiktok_url)
  if (data.whatsapp_number) sameAs.push(`https://wa.me/${data.whatsapp_number.replace(/\D/g, '')}`)
  if (sameAs.length > 0) schema.sameAs = sameAs

  return schema
}