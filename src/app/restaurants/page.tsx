import { createAdminClient } from '@/lib/supabase/admin'
import { Metadata } from 'next'
import RestaurantsClient from './RestaurantsClient'
import { Footer } from '@/components/layout/Footer'
import { getPlatformSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Restaurants — TerangaLink',
  description: 'Découvrez les meilleurs restaurants de Dakar et commandez en ligne via WhatsApp.',
  openGraph: {
    title: 'Restaurants sur TerangaLink',
    description: 'Découvrez et commandez chez les meilleurs restaurants de Dakar.',
    url: 'https://www.teranga-link.com/restaurants',
  },
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
    return <><RestaurantsClient restaurants={[]} /><Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} /></>
  }

  const restaurantIds = restaurants.map(r => r.id)
  const { data: reviews } = await admin
    .from('reviews')
    .select('restaurant_id, rating')
    .in('restaurant_id', restaurantIds)
    .eq('is_visible', true)

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

  return (
    <>
      <RestaurantsClient restaurants={enriched} />
      <Footer whatsapp={settings.whatsapp} email={settings.email} city={settings.city} />
    </>
  )
}
