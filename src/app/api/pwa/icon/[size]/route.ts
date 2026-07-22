import { NextRequest, NextResponse } from 'next/server'
import sharp from 'sharp'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getConnectedRestaurantPwa } from '@/lib/pwa/connectedRestaurant'

export const dynamic = 'force-dynamic'

const ALLOWED_SIZES = [180, 192, 512]

// Icône d'écran d'accueil (manifest + apple-touch-icon) redimensionnée à la
// volée depuis le logo du restaurant connecté — pas de génération/stockage
// à maintenir quand un commerçant change son logo. Coûte un fetch + un resize
// sharp par ajout à l'écran d'accueil, ce qui est rare, donc pas de souci de
// perf malgré l'absence de cache HTTP (nécessaire ici car le contenu dépend
// de la session).
export async function GET(req: NextRequest, { params }: { params: { size: string } }) {
  const size = Number(params.size)
  if (!ALLOWED_SIZES.includes(size)) {
    return NextResponse.json({ error: 'Invalid size' }, { status: 400 })
  }

  const restaurant = await getConnectedRestaurantPwa()

  let input: Buffer
  if (restaurant?.logo_url) {
    const sourceRes = await fetch(restaurant.logo_url)
    input = sourceRes.ok
      ? Buffer.from(await sourceRes.arrayBuffer())
      : await fs.readFile(path.join(process.cwd(), 'public/logo.jpg'))
  } else {
    input = await fs.readFile(path.join(process.cwd(), 'public/logo.jpg'))
  }

  const output = await sharp(input)
    .resize(size, size, { fit: 'cover', background: '#FFFFFF' })
    .png()
    .toBuffer()

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-cache',
    },
  })
}
