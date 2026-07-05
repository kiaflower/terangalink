export const SITE_NAME = 'TerangaLink'
export const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teranga-link.com'

export interface SeoMenuCategory {
  id: string
  name: string
}

export interface SeoMenuItem {
  name: string
  description: string | null
  price: number
  category_id: string | null
  is_available: boolean
}

export interface SeoRestaurantData {
  name: string
  slug: string
  description: string | null
  city: string | null
  neighborhood?: string | null
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
  // Enrichissement menu Schema.org
  menuCategories?: SeoMenuCategory[]
  menuItems?: SeoMenuItem[]
  // Enrichissement contenu SEO (noms bruts, non limités)
  menuCategoryNames?: string[]
  menuItemNames?: string[]
  reviewCount?: number
  avgRating?: number | null
}

export interface FaqEntry {
  question: string
  answer: string
}

export interface BreadcrumbItem {
  name: string
  url: string
}

// ─── Hash déterministe (FNV-1a) — sert de graine pour varier titres/descriptions/contenu ──
function hashString(s: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

function uniq(values: (string | null | undefined)[]): string[] {
  const seen = new Set<string>()
  const out: string[] = []
  for (const v of values) {
    if (!v) continue
    const trimmed = v.trim()
    if (!trimmed) continue
    const key = trimmed.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    out.push(trimmed)
  }
  return out
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

// `cuisine_type` contient parfois déjà le mot "Cuisine" (ex: "Cuisine sénégalaise").
// Cette fonction retire ce préfixe pour éviter "cuisine cuisine sénégalaise"
// quand on l'insère après notre propre mot "cuisine" dans une phrase.
function cuisineAdjective(cuisineType: string): string {
  return cuisineType.replace(/^cuisine\s+/i, '').trim()
}

function truncateWords(s: string, maxChars: number): string {
  if (s.length <= maxChars) return s
  const cut = s.slice(0, maxChars)
  return cut.replace(/\s+\S*$/, '') + '…'
}

// ─── Titre (≤60 caractères au total une fois le suffixe "| TerangaLink" du
// layout racine appliqué — cette fonction ne doit donc PAS ajouter elle-même
// le nom du site, sous peine de doublon "... | TerangaLink | TerangaLink") ──
const SITE_SUFFIX_LENGTH = ` | ${SITE_NAME}`.length

export function buildTitle(data: Pick<SeoRestaurantData, 'name' | 'city' | 'neighborhood' | 'cuisine_type' | 'topItems' | 'topCategories'>): string {
  const MAX = 60 - SITE_SUFFIX_LENGTH
  const topDish = (data.topItems?.[0] || data.topCategories?.[0] || data.cuisine_type || '').trim() || null
  const place = (data.neighborhood || data.city || '').trim() || null

  let title = data.name.trim()
  const optionalParts: string[] = []
  if (topDish) optionalParts.push(capitalize(topDish))
  if (place) optionalParts.push(`à ${place}`)

  for (const part of optionalParts) {
    const sep = part.startsWith('|') ? ' ' : ' — '
    const next = `${title}${sep}${part}`
    if (next.length <= MAX) title = next
  }

  if (title.length > MAX) title = truncateWords(title, MAX - 1)
  return title
}

// ─── Description auto (140-160 caractères, jamais identique entre 2 restos) ─
const DESC_OPENERS: Array<(name: string) => string> = [
  name => `${name} vous propose`,
  name => `Chez ${name}, savourez`,
  name => `${name} — découvrez`,
  name => `Envie de bon ? ${name} propose`,
  name => `${name} vous fait découvrir`,
]

const DESC_CTA: string[] = [
  'Commandez via WhatsApp',
  'Commande simple via WhatsApp',
  'Commandez en ligne sans appli',
  'Commande rapide via WhatsApp',
]

export function buildAutoDescription(data: SeoRestaurantData): string {
  const seed = hashString(data.slug || data.name)
  const place = data.neighborhood || data.city

  const menuHints = uniq([
    ...(data.topItems ?? []),
    ...(data.menuItemNames ?? []),
    ...(data.topCategories ?? []),
    ...(data.menuCategoryNames ?? []),
  ]).slice(0, 3).map(v => v.toLowerCase())

  const opener = DESC_OPENERS[seed % DESC_OPENERS.length](data.name)

  let core: string
  if (menuHints.length > 0) {
    core = `${opener} ${menuHints.join(', ')}`
  } else if (data.cuisine_type) {
    core = `${opener} sa cuisine ${cuisineAdjective(data.cuisine_type).toLowerCase()}`
  } else {
    core = `${opener} un large choix de plats`
  }

  const locality = place ? ` à ${place}` : ''
  const cta = DESC_CTA[(seed >>> 3) % DESC_CTA.length]

  let full = `${core}${locality}. ${cta} sur ${SITE_NAME}.`

  if (full.length < 140) {
    full = full.replace(/\.$/, '') + `, menu complet et livraison disponibles.`
  }
  if (full.length > 160) {
    full = truncateWords(full.slice(0, 159), 157)
  }
  return full
}

// ─── Mots-clés (générés, dédupliqués, plafonnés) ────────────────────────────
export function buildKeywords(data: SeoRestaurantData): string {
  const place = data.neighborhood || data.city
  const kw = new Set<string>()
  const add = (v?: string | null) => {
    if (!v) return
    const trimmed = v.trim()
    if (trimmed) kw.add(trimmed.toLowerCase())
  }

  add(data.name)
  add(data.cuisine_type)
  add(data.city)
  add(data.neighborhood)
  if (data.cuisine_type && data.city) add(`restaurant ${data.cuisine_type} ${data.city}`)
  if (place) add(`restaurant ${place}`)
  if (data.city) add(`commande en ligne ${data.city}`)
  if (data.city) add(`livraison ${data.city}`)
  add(`commander ${data.name}`)

  for (const cat of data.topCategories ?? []) add(cat)
  for (const cat of data.menuCategoryNames ?? []) add(cat)
  for (const item of data.topItems ?? []) add(item)
  for (const item of data.menuItemNames ?? []) add(item)

  add('whatsapp commande')
  add('menu en ligne')
  add(SITE_NAME.toLowerCase())
  add('sénégal')

  return Array.from(kw).slice(0, 15).join(', ')
}

// ─── Intros pour les pages agrégées (ville / ville+spécialité) ─────────────
export function buildCityIntro(cityLabel: string, count: number): string {
  const plural = count > 1 ? `${count} restaurants` : count === 1 ? 'un restaurant' : 'des restaurants'
  return `Découvrez ${plural} à ${cityLabel} sur ${SITE_NAME} : fast-food, cuisine africaine, pizzerias, pâtisseries et bien d'autres adresses. Consultez les menus et commandez en ligne via WhatsApp, sans application à installer.`
}

export function buildSpecialtyIntro(cityLabel: string, specialtyLabel: string, count: number): string {
  const plural = count > 1 ? `${count} restaurants proposent` : 'Un restaurant propose'
  return `${plural} ${specialtyLabel.toLowerCase()} à ${cityLabel} sur ${SITE_NAME}. Comparez les adresses, consultez les menus et commandez directement en ligne via WhatsApp.`
}

export function buildOgImageUrl(slug: string): string {
  return `${SITE_URL}/${slug}/opengraph-image`
}

export function buildCanonical(slug: string): string {
  return `${SITE_URL}/${slug}`
}

// ─── Bloc de contenu SEO visible (200-500 mots, unique par restaurant) ──────
const CONTENT_HOOKS: Array<(name: string, place: string | null, cuisine: string | null) => string> = [
  (name, place, cuisine) =>
    cuisine && place
      ? `${name} est un restaurant de cuisine ${cuisineAdjective(cuisine).toLowerCase()} situé à ${place}, référencé sur ${SITE_NAME}.`
      : place
        ? `${name} est un restaurant situé à ${place}, référencé sur ${SITE_NAME}.`
        : `${name} fait partie des restaurants référencés sur ${SITE_NAME}.`,
  (name, place, cuisine) =>
    place
      ? `Basé à ${place}, ${name} s'est fait une place parmi les restaurants à découvrir sur ${SITE_NAME}${cuisine ? ` grâce à sa cuisine ${cuisineAdjective(cuisine).toLowerCase()}` : ''}.`
      : `${name} propose${cuisine ? ` une cuisine ${cuisineAdjective(cuisine).toLowerCase()}` : ' une carte variée'} sur ${SITE_NAME}.`,
  (name, place, cuisine) =>
    `Sur ${SITE_NAME}, ${name}${place ? ` (${place})` : ''} met en avant${cuisine ? ` une cuisine ${cuisineAdjective(cuisine).toLowerCase()}` : ' son savoir-faire'} pour les gourmands pressés comme pour les amateurs de découvertes.`,
]

const CONTENT_MENU_INTROS: string[] = [
  'À la carte, on retrouve notamment',
  'Le menu met en avant',
  'Parmi les incontournables du menu figurent',
  'Les habitués recommandent en particulier',
]

const CONTENT_ORDER_LINES: Array<(name: string, place: string | null) => string> = [
  (name, place) => `Commander chez ${name} se fait simplement depuis sa page ${SITE_NAME}, avec confirmation directe via WhatsApp${place ? ` pour une livraison à ${place} et ses environs` : ''}.`,
  (name, place) => `${SITE_NAME} permet de consulter le menu de ${name} et d'envoyer sa commande par WhatsApp en quelques secondes, sans installer d'application${place ? `, pratique pour se faire livrer à ${place}` : ''}.`,
  (name) => `Que ce soit pour un repas rapide ou une commande groupée, ${name} traite les commandes reçues via WhatsApp directement depuis ${SITE_NAME}.`,
]

const CONTENT_CLOSINGS: Array<(name: string, categories: string[]) => string> = [
  (name, categories) => categories.length > 0
    ? `Les catégories disponibles chez ${name} incluent ${categories.join(', ')}, régulièrement mises à jour sur ${SITE_NAME}.`
    : `Le menu complet de ${name} est régulièrement mis à jour sur ${SITE_NAME}.`,
  (name, categories) => categories.length > 0
    ? `${name} organise sa carte autour de ${categories.join(', ')}, consultable à tout moment sur ${SITE_NAME}.`
    : `La carte de ${name} évolue régulièrement, à retrouver sur ${SITE_NAME}.`,
]

const CONTENT_FILLERS: Array<(name: string, place: string | null) => string> = [
  (name) => `Sur ${SITE_NAME}, chaque commande passée chez ${name} est confirmée directement par le restaurant via WhatsApp, sans création de compte ni téléchargement d'application.`,
  (name, place) => `${name} fait partie des adresses mises en avant par ${SITE_NAME}${place ? ` pour les habitants de ${place}` : ''} à la recherche d'une commande rapide et fiable.`,
  (name) => `Les photos, prix et disponibilités affichés sur la page de ${name} sont mis à jour directement par le restaurant, pour un menu toujours fidèle à la réalité.`,
  (name, place) => `Que ce soit pour une commande à emporter ou une livraison${place ? ` à ${place}` : ''}, ${name} reste joignable directement depuis sa page ${SITE_NAME}.`,
  (name) => `${SITE_NAME} met en relation les clients et ${name} sans intermédiaire ni frais cachés sur la commande.`,
]

export function buildSeoContentBlock(data: SeoRestaurantData): string {
  const seed = hashString(data.slug || data.name)
  const place = data.neighborhood || data.city || null

  const dishes = uniq([...(data.topItems ?? []), ...(data.menuItemNames ?? [])]).slice(0, 6)
  const categories = uniq([...(data.topCategories ?? []), ...(data.menuCategoryNames ?? [])]).slice(0, 5)

  const sentences: string[] = []

  sentences.push(CONTENT_HOOKS[seed % CONTENT_HOOKS.length](data.name, place, data.cuisine_type))

  if (dishes.length > 0) {
    const intro = CONTENT_MENU_INTROS[(seed >>> 2) % CONTENT_MENU_INTROS.length]
    sentences.push(`${intro} ${dishes.slice(0, 5).join(', ')}.`)
  }

  sentences.push(CONTENT_ORDER_LINES[(seed >>> 4) % CONTENT_ORDER_LINES.length](data.name, place))

  if (data.city && place !== data.city) {
    sentences.push(`${data.name} est référencé dans l'annuaire des restaurants de ${data.city} sur ${SITE_NAME}, aux côtés d'autres adresses de la ville.`)
  } else if (data.city) {
    sentences.push(`${data.name} figure dans l'annuaire des restaurants de ${data.city} sur ${SITE_NAME}.`)
  }

  sentences.push(CONTENT_CLOSINGS[(seed >>> 6) % CONTENT_CLOSINGS.length](data.name, categories))

  if (dishes.length > 0) {
    sentences.push(`Sur ${SITE_NAME}, la sélection de ${data.name} comprend aussi ${dishes.join(', ')}, avec mise à jour régulière des prix et disponibilités.`)
  }
  sentences.push(`${SITE_NAME} permet de consulter à tout moment les informations pratiques de ${data.name} : horaires, localisation${place ? ` à ${place}` : ''} et moyens de commande.`)

  // Garde-fou : garantit un minimum de 200 mots en ajoutant des phrases de
  // remplissage variées (toujours ancrées sur les vraies données du
  // restaurant) tant que le seuil n'est pas atteint.
  const wordCount = (text: string) => text.split(/\s+/).filter(Boolean).length
  let fillerIndex = 0
  while (wordCount(sentences.join(' ')) < 200 && fillerIndex < CONTENT_FILLERS.length * 2) {
    sentences.push(CONTENT_FILLERS[(seed + fillerIndex) % CONTENT_FILLERS.length](data.name, place))
    fillerIndex++
  }

  let text = sentences.join(' ')

  // Garde-fou : tronque si trop long
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length > 500) {
    text = words.slice(0, 500).join(' ') + '…'
  }

  return text
}

// ─── FAQ auto (uniquement si des données réelles le justifient) ────────────
export function buildFaqEntries(data: SeoRestaurantData): FaqEntry[] {
  const entries: FaqEntry[] = []
  const place = data.neighborhood || data.city

  if (data.whatsapp_number) {
    entries.push({
      question: `Comment commander chez ${data.name} ?`,
      answer: `Consultez le menu de ${data.name} sur sa page ${SITE_NAME} puis envoyez votre commande directement via WhatsApp au ${data.whatsapp_number}.`,
    })
  }

  if (place) {
    entries.push({
      question: `${data.name} livre-t-il à ${place} ?`,
      answer: `${data.name} est situé${data.address ? ` ${data.address}` : ''} à ${place}${data.city && data.city !== place ? ` (${data.city})` : ''} et propose la commande en ligne via ${SITE_NAME}.`,
    })
  }

  if (data.opening_hours && Object.keys(data.opening_hours).length > 0) {
    entries.push({
      question: `Quels sont les horaires d'ouverture de ${data.name} ?`,
      answer: `Les horaires de ${data.name} sont indiqués en temps réel sur sa page ${SITE_NAME}, avec un statut "ouvert" ou "fermé" mis à jour automatiquement.`,
    })
  }

  return entries
}

// ─── Schema.org builders ─────────────────────────────────────────────────────
export function buildFaqSchema(entries: FaqEntry[]): object | null {
  if (entries.length === 0) return null
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map(e => ({
      '@type': 'Question',
      name: e.question,
      acceptedAnswer: { '@type': 'Answer', text: e.answer },
    })),
  }
}

export function buildBreadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

export function buildWebsiteSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/restaurants?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

export function buildOrganizationSchema(): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    logo: `${SITE_URL}/logo-terangalink.jpg`,
  }
}

const DAYS_FR_TO_SCHEMA: Record<string, string> = {
  lundi: 'Monday', mardi: 'Tuesday', mercredi: 'Wednesday',
  jeudi: 'Thursday', vendredi: 'Friday', samedi: 'Saturday', dimanche: 'Sunday',
}

export function buildSchemaOrg(data: SeoRestaurantData): object {
  const schema: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': ['Restaurant', 'LocalBusiness', 'FoodEstablishment'],
    name: data.name,
    url: buildCanonical(data.slug),
    priceRange: 'FCFA',
  }

  if (data.description) schema.description = data.description
  if (data.cuisine_type) schema.servesCuisine = data.cuisine_type

  const image = data.cover_url ?? data.logo_url ?? `${SITE_URL}/logo-terangalink.jpg`
  schema.image = { '@type': 'ImageObject', url: image }
  if (data.logo_url) schema.logo = data.logo_url

  if (data.address || data.city || data.neighborhood) {
    schema.address = {
      '@type': 'PostalAddress',
      ...(data.address ? { streetAddress: data.address } : {}),
      ...(data.neighborhood ? { addressRegion: data.neighborhood } : {}),
      ...(data.city ? { addressLocality: data.city } : {}),
      addressCountry: 'SN',
    }
  }

  const tel = data.whatsapp_number ?? data.phone
  if (tel) schema.telephone = tel

  if (data.latitude && data.longitude) {
    schema.geo = { '@type': 'GeoCoordinates', latitude: data.latitude, longitude: data.longitude }
  }

  if (data.reviewCount && data.reviewCount > 0 && data.avgRating) {
    schema.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: data.avgRating,
      reviewCount: data.reviewCount,
    }
  }

  // Horaires — format openingHours (string[]) ET openingHoursSpecification
  if (data.opening_hours) {
    const hoursStrings: string[] = []
    const hoursSpec: object[] = []

    for (const [dayFr, slot] of Object.entries(data.opening_hours)) {
      if (slot.ferme) continue
      const dayEn = DAYS_FR_TO_SCHEMA[dayFr.toLowerCase()]
      if (!dayEn) continue
      if (slot.ouverture && slot.fermeture) {
        hoursStrings.push(`${dayEn} ${slot.ouverture}-${slot.fermeture}`)
        hoursSpec.push({
          '@type': 'OpeningHoursSpecification',
          dayOfWeek: `https://schema.org/${dayEn}`,
          opens: slot.ouverture,
          closes: slot.fermeture,
        })
      }
    }
    if (hoursStrings.length > 0) schema.openingHours = hoursStrings
    if (hoursSpec.length > 0) schema.openingHoursSpecification = hoursSpec
  }

  // Menu enrichi avec sections et items
  if (data.menuCategories && data.menuItems && data.menuCategories.length > 0) {
    schema.hasMenu = {
      '@type': 'Menu',
      hasMenuSection: data.menuCategories.map(cat => ({
        '@type': 'MenuSection',
        name: cat.name,
        hasMenuItem: (data.menuItems ?? [])
          .filter(i => i.category_id === cat.id && i.is_available)
          .map(item => ({
            '@type': 'MenuItem',
            name: item.name,
            ...(item.description ? { description: item.description } : {}),
            offers: {
              '@type': 'Offer',
              price: item.price,
              priceCurrency: 'XOF',
            },
          })),
      })).filter(s => s.hasMenuItem.length > 0),
    }
  }

  const sameAs: string[] = []
  if (data.facebook_url) sameAs.push(data.facebook_url)
  if (data.instagram_url) sameAs.push(data.instagram_url)
  if (data.tiktok_url) sameAs.push(data.tiktok_url)
  if (data.whatsapp_number) sameAs.push(`https://wa.me/${data.whatsapp_number.replace(/\D/g, '')}`)
  if (sameAs.length > 0) schema.sameAs = sameAs

  return schema
}
