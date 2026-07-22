import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCanonicalSiteUrl } from '@/lib/site-url'
import { CUISINE_TYPES } from '@/lib/cuisines'

export const dynamic = 'force-dynamic'

const STATIC_PATHS = [
  '', 'restaurants', 'pour-les-restaurants', 'inscription', 'early-access',
  'rendez-vous', 'legal', 'favoris',
]

interface ProductSitemapRow {
  slug: string
  updated_at: string
  restaurants: { slug: string } | { slug: string }[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getCanonicalSiteUrl()
  const supabase = createClient()

  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('is_demo', false)

  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at, restaurants!inner(slug, is_active, is_demo)')
    .eq('is_available', true)
    .eq('restaurants.is_active', true)
    .eq('restaurants.is_demo', false)
    .limit(5000)

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(path => ({
    url: `${siteUrl}/${path}`,
    changeFrequency: path === '' || path === 'restaurants' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.6,
  }))

  const restaurantEntries: MetadataRoute.Sitemap = (restaurants ?? []).map(b => ({
    url: `${siteUrl}/${b.slug}`,
    lastModified: b.updated_at ?? undefined,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const categoryEntries: MetadataRoute.Sitemap = CUISINE_TYPES.map(category => ({
    url: `${siteUrl}/restaurants?category=${encodeURIComponent(category)}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const productEntries: MetadataRoute.Sitemap = ((products ?? []) as unknown as ProductSitemapRow[]).map(p => {
    const restaurant = Array.isArray(p.restaurants) ? p.restaurants[0] : p.restaurants
    return {
      url: `${siteUrl}/${restaurant.slug}/plat/${p.slug}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }
  })

  return [...staticEntries, ...restaurantEntries, ...categoryEntries, ...productEntries]
}
