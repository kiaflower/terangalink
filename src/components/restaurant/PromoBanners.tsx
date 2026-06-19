'use client'

import type { ThemeTokens } from '@/lib/theme'

export interface Banner {
  id: string
  restaurant_id: string
  text: string
  icon?: string | null
  bg_color?: string | null
  starts_at?: string | null
  ends_at?: string | null
  is_active: boolean
  position: number
  created_at: string
}

interface PromoBannersProps {
  banners: Banner[]
  tokens: ThemeTokens
}

function isVisible(banner: Banner): boolean {
  if (!banner.is_active) return false
  const now = Date.now()
  if (banner.starts_at && now < new Date(banner.starts_at).getTime()) return false
  if (banner.ends_at && now > new Date(banner.ends_at).getTime()) return false
  return true
}

export function PromoBanners({ banners, tokens }: PromoBannersProps) {
  const visible = banners.filter(isVisible)
  if (visible.length === 0) return null

  return (
    <div className="space-y-2 mb-6">
      {visible.map(banner => (
        <div
          key={banner.id}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-white"
          style={{
            backgroundColor: banner.bg_color || tokens.button,
            boxShadow: `0 2px 12px ${banner.bg_color || tokens.button}40`,
          }}
        >
          {banner.icon && (
            <span className="text-base flex-shrink-0" aria-hidden>{banner.icon}</span>
          )}
          <span>{banner.text}</span>
        </div>
      ))}
    </div>
  )
}
