/**
 * TerangaLink — Sitemap dynamique
 * Route : /sitemap.xml
 *
 * Inclut automatiquement tous les restaurants actifs.
 * Mis à jour à chaque build / revalidation.
 */

import { MetadataRoute } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teranga-link.com'

export const revalidate = 3600 // revalider toutes les heures

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // Pages statiques
  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/legal`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.3,
    },
  ]

  // Restaurants actifs
  let restaurantPages: MetadataRoute.Sitemap = []
  try {
    const adminClient = createAdminClient()
    const { data: restaurants } = await adminClient
      .from('restaurants')
      .select('slug, updated_at')
      .eq('is_active', true)
      .order('updated_at', { ascending: false })

    if (restaurants) {
      restaurantPages = (restaurants as Array<{ slug: string; updated_at: string }>).map(r => ({
        url: `${SITE_URL}/${r.slug}`,
        lastModified: new Date(r.updated_at),
        changeFrequency: 'daily' as const,
        priority: 0.8,
      }))
    }
  } catch (err) {
    console.error('[sitemap] Failed to fetch restaurants:', err)
  }

  return [...staticPages, ...restaurantPages]
}
