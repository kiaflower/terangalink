import { createAdminClient } from '@/lib/supabase/admin'
import { SITE_URL } from '@/lib/seo'
import { MetadataRoute } from 'next'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const admin = createAdminClient()
  const baseUrl = SITE_URL

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('is_demo', false)

  const restaurantUrls: MetadataRoute.Sitemap = (restaurants ?? []).map(r => ({
    url: `${baseUrl}/${r.slug}`,
    lastModified: new Date(r.updated_at),
    changeFrequency: 'weekly' as const,
    priority: 0.8,
  }))

  return [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/restaurants`, lastModified: new Date(), changeFrequency: 'daily', priority: 0.9 },
    { url: `${baseUrl}/pour-les-restaurants`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.7 },
    ...restaurantUrls,
  ]
}
