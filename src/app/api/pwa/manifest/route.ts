import { NextResponse } from 'next/server'
import { getConnectedBoutiquePwa } from '@/lib/pwa/connectedBoutique'

// Manifest par boutique : Next.js n'a pas de convention de fichier pour un
// manifest.json qui varie selon la session (le dashboard boutique n'a pas de
// slug dans l'URL), donc on le génère ici à la demande à partir des données
// de la boutique connectée. `cookies()` dans getConnectedBoutiquePwa() exclut
// automatiquement cette route du cache statique/edge de Next.
export const dynamic = 'force-dynamic'

export async function GET() {
  const boutique = await getConnectedBoutiquePwa()

  const name = boutique ? `${boutique.name} — TerangaSpot` : 'TerangaSpot — Boutique'
  const shortName = boutique?.name?.slice(0, 12) || 'TerangaSpot'
  const themeColor = boutique?.primary_color || '#F97316'
  const backgroundColor = boutique?.background_color || '#FFFFFF'

  const manifest = {
    name,
    short_name: shortName,
    description: 'Tableau de bord boutique TerangaSpot',
    start_url: '/dashboard/boutique',
    scope: '/dashboard/boutique',
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
