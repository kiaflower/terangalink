/**
 * TerangaLink — robots.txt dynamique
 * Route : /robots.txt
 */

import { MetadataRoute } from 'next'

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://teranga-link.com'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        // Indexation publique complète
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard',
          '/restaurant/',       // dashboards restaurateurs
          '/(protected)/',
          '/api/',
          '/demo',
          '/_next/',
          '/admin',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
