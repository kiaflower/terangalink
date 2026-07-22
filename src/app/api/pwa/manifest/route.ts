import { NextResponse } from 'next/server'
import { getConnectedRestaurantPwa } from '@/lib/pwa/connectedRestaurant'

// Manifest par restaurant : Next.js n'a pas de convention de fichier pour un
// manifest.json qui varie selon la session (le dashboard restaurant n'a pas de
// slug dans l'URL), donc on le génère ici à la demande à partir des données
// du restaurant connectée. `cookies()` dans getConnectedRestaurantPwa() exclut
// automatiquement cette route du cache statique/edge de Next.
export const dynamic = 'force-dynamic'

export async function GET() {
  const restaurant = await getConnectedRestaurantPwa()

  const name = restaurant ? `${restaurant.name} — TerangaLink` : 'TerangaLink — Restaurant'
  const shortName = restaurant?.name?.slice(0, 12) || 'TerangaLink'
  const themeColor = restaurant?.primary_color || '#F97316'
  const backgroundColor = restaurant?.background_color || '#FFFFFF'

  const manifest = {
    name,
    short_name: shortName,
    description: 'Tableau de bord restaurant TerangaLink',
    start_url: '/dashboard/restaurant',
    scope: '/dashboard/restaurant',
    display: 'standalone',
    background_color: backgroundColor,
    theme_color: themeColor,
    icons: [
      { src: '/api/pwa/icon/192', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/api/pwa/icon/512', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/api/pwa/icon/192', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/api/pwa/icon/512', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'private, no-cache',
    },
  })
}
