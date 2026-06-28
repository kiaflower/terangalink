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

export default async function RestaurantsPage() {
  const admin = createAdminClient()
  const settings = await getPlatformSettings()

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, name, slug, description, city, cuisine_type, logo_url, cover_url, is_active, is_boosted')
    .eq('is_active', true)
    .eq('is_demo', false)
    .order('name', { ascending: true })

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
      .select('restaurant_id, name, description')
      .in('restaurant_id', restaurantIds)
      .eq('is_available', true),
  ])

  const ratingMap: Record<string, { avg: number; count: number }> = {}
  if (reviews) {
    for (const r of reviews) {
      if (!ratingMap[r.restaurant_id]) ratingMap[r.restaurant_id] = { avg: 0, count: 0 }
      ratingMap[r.restaurant_id].count++
      ratingMap[r.restaurant_id].avg += r.rating
    }
    for (const id of Object.keys(ratingMap)) {
      ratingMap[id].avg = Math.round((ratingMap[id].avg / ratingMap[id].count) * 10) / 10
    }
  }

  const enriched = restaurants.map(r => ({
    ...r,
    rating: ratingMap[r.id]?.avg ?? null,
    review_count: ratingMap[r.id]?.count ?? 0,
    is_boosted: (r as Record<string, unknown>).is_boosted === true,
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
      <RestaurantsClient restaurants={enriched} menuItems={menuItems ?? []} />
      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </>
  )
}
