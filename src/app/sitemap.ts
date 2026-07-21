import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase/server'
import { getCanonicalSiteUrl } from '@/lib/site-url'
import { SHOP_CATEGORIES } from '@/lib/categories'

export const dynamic = 'force-dynamic'

const STATIC_PATHS = [
  '', 'boutiques', 'pour-les-boutiques', 'inscription', 'early-access',
  'rendez-vous', 'legal', 'favoris',
]

interface ProductSitemapRow {
  slug: string
  updated_at: string
  boutiques: { slug: string } | { slug: string }[]
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getCanonicalSiteUrl()
  const supabase = createClient()

  const { data: boutiques } = await supabase
    .from('boutiques')
    .select('slug, updated_at')
    .eq('is_active', true)
    .eq('is_demo', false)

  const { data: products } = await supabase
    .from('products')
    .select('slug, updated_at, boutiques!inner(slug, is_active, is_demo)')
    .eq('is_available', true)
    .eq('boutiques.is_active', true)
    .eq('boutiques.is_demo', false)
    .limit(5000)

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map(path => ({
    url: `${siteUrl}/${path}`,
    changeFrequency: path === '' || path === 'boutiques' ? 'daily' : 'weekly',
    priority: path === '' ? 1 : 0.6,
  }))

  const boutiqueEntries: MetadataRoute.Sitemap = (boutiques ?? []).map(b => ({
    url: `${siteUrl}/${b.slug}`,
    lastModified: b.updated_at ?? undefined,
    changeFrequency: 'daily',
    priority: 0.8,
  }))

  const categoryEntries: MetadataRoute.Sitemap = SHOP_CATEGORIES.map(category => ({
    url: `${siteUrl}/boutiques?category=${encodeURIComponent(category)}`,
    changeFrequency: 'weekly',
    priority: 0.5,
  }))

  const productEntries: MetadataRoute.Sitemap = ((products ?? []) as unknown as ProductSitemapRow[]).map(p => {
    const boutique = Array.isArray(p.boutiques) ? p.boutiques[0] : p.boutiques
    return {
      url: `${siteUrl}/${boutique.slug}/produit/${p.slug}`,
      lastModified: p.updated_at ?? undefined,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }
  })

  return [...staticEntries, ...boutiqueEntries, ...categoryEntries, ...productEntries]
}
