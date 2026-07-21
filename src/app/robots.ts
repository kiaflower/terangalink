import type { MetadataRoute } from 'next'
import { getCanonicalSiteUrl } from '@/lib/site-url'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${getCanonicalSiteUrl()}/sitemap.xml`,
  }
}
