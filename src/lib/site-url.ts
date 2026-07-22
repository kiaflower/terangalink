import { headers } from 'next/headers'

/**
 * Resolves the current site's public origin from the incoming request
 * (works with any custom domain, no code change needed if the domain changes).
 * Server-side only (Server Components, Route Handlers, generateMetadata, robots/sitemap).
 */
export function getSiteUrl(): string {
  const h = headers()
  const host = h.get('x-forwarded-host') ?? h.get('host')
  if (host) {
    const proto = h.get('x-forwarded-proto') ?? (host.startsWith('localhost') ? 'http' : 'https')
    return `${proto}://${host}`
  }
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://teranga-link.com'
}

/**
 * Domaine canonique fixe, sans lecture de headers()/cookies(). À utiliser dans les
 * pages qui doivent rester éligibles à l'ISR (ex: fiches plat) — un canonical/OG
 * doit de toute façon toujours pointer vers le domaine de production, jamais vers
 * un domaine de preview.
 */
export function getCanonicalSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://teranga-link.com'
}
