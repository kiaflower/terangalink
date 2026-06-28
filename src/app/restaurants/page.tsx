import { createAdminClient } from '@/lib/supabase/admin'
import { Metadata } from 'next'
import RestaurantsClient from './RestaurantsClient'
import { Footer } from '@/components/layout/Footer'
import { getPlatformSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Restaurants à Dakar — Commandez via WhatsApp | TerangaLink',
  description: 'Découvrez les meilleurs restaurants de Dakar et du Sénégal. Commandez en ligne via WhatsApp — Yassa, Thiéboudienne, Fast food, Pâtisserie. Livraison rapide, sans appli.',
  keywords: 'restaurants Dakar, commander en ligne Dakar, livraison repas Sénégal, restaurant WhatsApp Dakar, annuaire restaurant Dakar',
  openGraph: {
    title: 'Restaurants à Dakar — TerangaLink',
    description: 'Trouvez et commandez chez les meilleurs restaurants de Dakar via WhatsApp.',
    url: 'https://www.teranga-link.com/restaurants',
    siteName: 'TerangaLink',
    locale: 'fr_SN',
    type: 'website',
  },
  twitter: { card: 'summary_large_image', title: 'Restaurants à Dakar | TerangaLink', description: 'Commandez chez les meilleurs restaurants de Dakar via WhatsApp.' },
  alternates: { canonical: 'https://www.teranga-link.com/restaurants' },
}

function calcRankingScore(r: {
  logo_url: string | null
  description: string | null
  opening_hours: unknown
  address: string | null
  phone: string | null
  cuisine_type: string | null
  review_count: number
  rating: number | null
  photo_item_count: number
}): number {
  // Complétude profil (40 pts max)
  let score = 0
  if (r.logo_url) score += 8
  if (r.description) score += 8
  if (r.opening_hours && Object.keys(r.opening_hours as object).length > 0) score += 8
  if (r.address) score += 8
  if (r.phone) score += 4
  if (r.cuisine_type) score += 4

  // Avis (30 pts max : 6 pts par avis, plafonné à 5 avis)
  score += Math.min(r.review_count, 5) * 6

  // Note moyenne (20 pts max)
  if (r.rating && r.review_count > 0) {
    score += Math.round((r.rating / 5) * 20)
  }

  // Plats avec photo (10 pts max : 2 pts par plat, plafonné à 5)
  score += Math.min(r.photo_item_count, 5) * 2

  return score
}

const NEW_RESTAURANT_DAYS = 15

export default async function RestaurantsPage() {
  const admin = createAdminClient()
  const settings = await getPlatformSettings()

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, slug, description, city, cuisine_type, logo_url, cover_url, is_active, is_boosted, created_at, address, phone, opening_hours')
    .eq('is_active', true)
    .eq('is_demo', false)

  if (!restaurants || restaurants.length === 0) {
    return <><RestaurantsClient restaurants={[]} menuItems={[]} /><Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} /></>
  }

  const restaurantIds = restaurants.map(r => r.id)
  const [{ data: reviews }, { data: menuItems }] = await Promise.all([
    admin.from('reviews')
      .select('restaurant_id, rating')
      .in('restaurant_id', restaurantIds)
      .eq('is_visible', true),
    admin.from('menu_items')
      .select('restaurant_id, name, description, image_url')
      .in('restaurant_id', restaurantIds)
      .eq('is_available', true),
  ])

  // Agrégations reviews
  const ratingMap: Record<string, { avg: number; count: number }> = {}
  for (const rev of reviews ?? []) {
    if (!ratingMap[rev.restaurant_id]) ratingMap[rev.restaurant_id] = { avg: 0, count: 0 }
    ratingMap[rev.restaurant_id].count++
    ratingMap[rev.restaurant_id].avg += rev.rating
  }
  for (const id of Object.keys(ratingMap)) {
    ratingMap[id].avg = Math.round((ratingMap[id].avg / ratingMap[id].count) * 10) / 10
  }

  // Plats avec photo par restaurant
  const photoCountMap: Record<string, number> = {}
  for (const item of menuItems ?? []) {
    if ((item as Record<string, unknown>).image_url) {
      photoCountMap[item.restaurant_id] = (photoCountMap[item.restaurant_id] ?? 0) + 1
    }
  }

  const now = Date.now()

  const enriched = restaurants.map(r => {
    const rv = ratingMap[r.id] ?? { avg: null, count: 0 }
    const ageMs = now - new Date(r.created_at).getTime()
    const isNew = ageMs < NEW_RESTAURANT_DAYS * 24 * 60 * 60 * 1000
    const isBoosted = (r as Record<string, unknown>).is_boosted === true
    const photo_item_count = photoCountMap[r.id] ?? 0
    const rating = rv.count > 0 ? rv.avg : null
    const review_count = rv.count

    const rankScore = calcRankingScore({
      logo_url: r.logo_url,
      description: r.description,
      opening_hours: r.opening_hours,
      address: r.address,
      phone: r.phone,
      cuisine_type: r.cuisine_type,
      review_count,
      rating,
      photo_item_count,
    })

    return {
      id: r.id,
      name: r.name,
      slug: r.slug,
      description: r.description,
      city: r.city,
      cuisine_type: r.cuisine_type,
      logo_url: r.logo_url,
      cover_url: r.cover_url,
      created_at: r.created_at,
      rating,
      review_count,
      is_boosted: isBoosted,
      is_new: isNew,
      rank_score: rankScore,
    }
  })

  // Tri : boostés → nouveaux → score décroissant
  enriched.sort((a, b) => {
    if (a.is_boosted !== b.is_boosted) return a.is_boosted ? -1 : 1
    if (a.is_new !== b.is_new) return a.is_new ? -1 : 1
    if (a.rank_score !== b.rank_score) return b.rank_score - a.rank_score
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const menuItemsForClient = (menuItems ?? []).map(item => ({
    restaurant_id: item.restaurant_id,
    name: item.name,
    description: item.description,
  }))

  const schemaItemList = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Restaurants au Sénégal sur TerangaLink',
    description: 'Liste des restaurants disponibles sur TerangaLink — Dakar et Sénégal',
    numberOfItems: enriched.length,
    itemListElement: enriched.map((r, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'Restaurant',
        name: r.name,
        url: `https://www.teranga-link.com/${r.slug}`,
        address: { '@type': 'PostalAddress', addressLocality: r.city || 'Dakar', addressCountry: 'SN' },
        servesCuisine: r.cuisine_type || 'Sénégalaise',
        ...(r.rating ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: r.rating, reviewCount: r.review_count } } : {}),
      },
    })),
  }

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaItemList) }} />
      <RestaurantsClient restaurants={enriched} menuItems={menuItemsForClient} />
      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </>
  )
}
