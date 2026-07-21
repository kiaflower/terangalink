import sharp from 'sharp'
import { NextRequest, NextResponse } from 'next/server'

// Seuls ces buckets sont servis — `path` n'est jamais utilisé pour construire une
// URL externe arbitraire (pas de proxy ouvert / SSRF), seulement pour compléter
// notre propre URL Supabase.
const ALLOWED_PREFIXES = ['boutique-images/', 'product-images/']

// WhatsApp est bien plus strict que le débogueur Facebook sur le poids de
// og:image, et Supabase ne peut pas recompresser un PNG (format sans perte) —
// on retélécharge donc la source une fois ici et on la réencode nous-mêmes en
// JPEG à un poids qui tient sous la barre où WhatsApp échoue silencieusement.
export async function GET(req: NextRequest) {
  const path = req.nextUrl.searchParams.get('path')
  if (!path || !ALLOWED_PREFIXES.some(prefix => path.startsWith(prefix))) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const sourceUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${path}`
  const sourceRes = await fetch(sourceUrl)
  if (!sourceRes.ok) {
    return NextResponse.json({ error: 'Source image not found' }, { status: 404 })
  }

  const input = Buffer.from(await sourceRes.arrayBuffer())
  const output = await sharp(input)
    .resize(1200, 630, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer()

  return new NextResponse(output, {
    headers: {
      'Content-Type': 'image/jpeg',
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  })
}
