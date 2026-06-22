import { ImageResponse } from 'next/og'
import { createAdminClient } from '@/lib/supabase/admin'

export const alt = 'Aperçu du restaurant'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

interface Props {
  params: { slug: string }
}

export default async function RestaurantOGImage({ params }: Props) {
  let name = 'Restaurant'
  let city = ''
  let cuisineType = ''
  let coverUrl: string | null = null
  let logoUrl: string | null = null

  try {
    const adminClient = createAdminClient()
    const { data } = await adminClient
      .from('restaurants')
      .select('name, city, cuisine_type, logo_url, cover_url, is_active')
      .eq('slug', params.slug)
      .single()

    if (data && data.is_active) {
      name = data.name ?? 'Restaurant'
      city = data.city ?? ''
      cuisineType = data.cuisine_type ?? ''
      coverUrl = data.cover_url ?? null
      logoUrl = data.logo_url ?? null
    }
  } catch {
    // fallback silencieux
  }

  const subtitle = [cuisineType, city].filter(Boolean).join(' · ')

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {coverUrl ? (
          <img
            src={coverUrl}
            alt=""
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <div
            style={{
              position: 'absolute', inset: 0,
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #1e3a5f 100%)',
            }}
          />
        )}

        <div
          style={{
            position: 'absolute', inset: 0,
            background: coverUrl
              ? 'linear-gradient(to top, rgba(0,0,0,0.92) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.15) 100%)'
              : 'rgba(0,0,0,0.3)',
          }}
        />

        <div
          style={{
            position: 'absolute', top: '32px', right: '40px',
            background: '#f97316', color: 'white',
            fontWeight: 800, fontSize: '22px',
            padding: '8px 20px', borderRadius: '99px',
            display: 'flex',
          }}
        >
          TerangaLink
        </div>

        <div
          style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '40px 56px', display: 'flex', flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '24px', marginBottom: '16px' }}>
            {logoUrl && (
              <img
                src={logoUrl}
                alt=""
                style={{
                  width: '96px', height: '96px', borderRadius: '16px',
                  objectFit: 'cover', border: '3px solid rgba(255,255,255,0.2)',
                }}
              />
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div
                style={{
                  color: 'white',
                  fontSize: name.length > 22 ? '52px' : '64px',
                  fontWeight: 900, lineHeight: 1.05,
                }}
              >
                {name}
              </div>
              {subtitle && (
                <div style={{ color: '#f97316', fontSize: '28px', fontWeight: 600 }}>
                  {subtitle}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex' }}>
            <div
              style={{
                background: '#25D366', color: 'white',
                fontWeight: 700, fontSize: '22px',
                padding: '10px 24px', borderRadius: '99px',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}
            >
              📲 Commander via WhatsApp
            </div>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}