export function jsonLdScript(data: Record<string, unknown>) {
  // Échappe les "<" pour empêcher toute fermeture prématurée de la balise <script>
  // si une valeur (nom de produit, description...) contient "</script>".
  return JSON.stringify(data).replace(/</g, '\\u003c')
}

export function buildProductJsonLd(input: {
  name: string
  description: string
  images: string[]
  boutiqueName: string
  price: number
  url: string
  inStock: boolean
}) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'Product',
    name: input.name,
    image: input.images,
    description: input.description,
    brand: { '@type': 'Brand', name: input.boutiqueName },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'XOF',
      price: String(Math.round(input.price)),
      availability: input.inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url: input.url,
    },
  }
}

export function buildBreadcrumbJsonLd(items: { name: string; url: string }[]) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildLocalBusinessJsonLd(input: {
  name: string
  url: string
  image?: string | null
  telephone?: string | null
  address?: string | null
  city?: string | null
  latitude?: number | null
  longitude?: number | null
}) {
  return {
    '@context': 'https://schema.org/',
    '@type': 'LocalBusiness',
    name: input.name,
    url: input.url,
    ...(input.image ? { image: input.image } : {}),
    ...(input.telephone ? { telephone: input.telephone } : {}),
    address: {
      '@type': 'PostalAddress',
      ...(input.address ? { streetAddress: input.address } : {}),
      addressLocality: input.city ?? 'Dakar',
      addressCountry: 'SN',
    },
    ...(input.latitude != null && input.longitude != null
      ? { geo: { '@type': 'GeoCoordinates', latitude: input.latitude, longitude: input.longitude } }
      : {}),
  }
}
