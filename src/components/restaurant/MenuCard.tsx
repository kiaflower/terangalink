'use client'

import Image from 'next/image'
import { Tag, Pin } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { FavoriteButton } from '@/components/restaurant/FavoriteButton'
import type { MenuItem } from '@/lib/types'
import type { ThemeTokens } from '@/lib/theme'

interface MenuCardProps {
  item: MenuItem
  restaurantId: string
  restaurantSlug: string
  restaurantPhone: string
  restaurantName: string
  restaurantLogoUrl?: string | null
  tokens: ThemeTokens
  isPremium?: boolean
  showFavorite?: boolean
  onOpenProduct: (item: MenuItem) => void
}

// Badge config (Phase 6 — Premium)
const BADGE_STYLES: Record<string, { bg: string; text: string; emoji: string }> = {
  'Best Seller': { bg: 'rgba(249,115,22,0.9)', text: '#fff', emoji: '🔥' },
  'Nouveau':     { bg: 'rgba(34,197,94,0.9)',  text: '#fff', emoji: '✨' },
  'Promotion':   { bg: 'rgba(239,68,68,0.9)',  text: '#fff', emoji: '🏷️' },
  'Recommandé':  { bg: 'rgba(99,102,241,0.9)', text: '#fff', emoji: '⭐' },
}

export function MenuCard({
  item,
  restaurantId,
  restaurantSlug,
  restaurantName,
  restaurantLogoUrl,
  tokens,
  isPremium = false,
  showFavorite = false,
  onOpenProduct,
}: MenuCardProps) {

  // Stock state (Premium)
  const stockOut = isPremium && item.stock_enabled && (item.stock_quantity ?? 0) <= 0
  const stockLow = isPremium && item.stock_enabled && !stockOut &&
    (item.stock_quantity ?? 0) <= (item.stock_low_threshold ?? 5)

  // Preorder blocked
  const now = Date.now()
  const preorderBlocked = isPremium && item.preorder_enabled && (
    (item.preorder_open_at && now < new Date(item.preorder_open_at).getTime()) ||
    (item.preorder_close_at && now > new Date(item.preorder_close_at).getTime()) ||
    (item.preorder_max_qty !== null && item.preorder_max_qty !== undefined &&
      (item.preorder_reserved ?? 0) >= item.preorder_max_qty)
  )

  const isUnavailable = !item.is_available || stockOut || preorderBlocked

  // Has variants
  const hasVariants = isPremium && item.variants && item.variants.length > 0
  const minPrice = hasVariants
    ? Math.min(...(item.variants ?? []).map(v => v.price))
    : item.price

  // Featured badge
  const badgeStyle = isPremium && item.is_featured && item.featured_label
    ? BADGE_STYLES[item.featured_label] ?? { bg: 'rgba(99,102,241,0.9)', text: '#fff', emoji: '⭐' }
    : null

  return (
    <div
      onClick={() => onOpenProduct(item)}
      className="group rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
      style={{
        backgroundColor: tokens.bgCard,
        border: `1px solid ${tokens.border}`,
        opacity: isUnavailable ? 0.6 : 1,
      }}
    >
      {/* Image */}
      <div className="relative w-full h-40 overflow-hidden" style={{ backgroundColor: tokens.bgCardHover }}>
        {(() => {
          const imgSrc = item.image_urls?.[0] || item.image_url || null
          return imgSrc ? (
            <Image
              src={imgSrc}
              alt={item.name}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-300"
              sizes="(max-width: 640px) 50vw, 33vw"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: tokens.bgCardHover }}>
              <span className="text-4xl opacity-30">🍽️</span>
            </div>
          )
        })()}

        {/* Indisponible overlay */}
        {isUnavailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white text-xs font-semibold bg-black/50 px-3 py-1 rounded-full">
              {stockOut ? 'Rupture' : preorderBlocked ? 'Indisponible' : 'Indisponible'}
            </span>
          </div>
        )}

        {/* Badge Premium (Phase 6) */}
        {badgeStyle && (
          <div
            className="absolute top-2 left-2 flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full shadow"
            style={{ backgroundColor: badgeStyle.bg, color: badgeStyle.text }}
          >
            <span>{badgeStyle.emoji}</span>
            <span>{item.featured_label}</span>
          </div>
        )}

        {/* Épinglé (Phase 6) */}
        {isPremium && item.is_pinned && (
          <div
            className="absolute bottom-2 right-2 w-6 h-6 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
            <Pin className="w-3 h-3 text-white" />
          </div>
        )}

        {/* Favori — visible uniquement quand on arrive depuis l'annuaire */}
        {showFavorite && (
          <div className="absolute top-2 right-2 z-10">
            <FavoriteButton
              item={{
                type: 'product',
                id: item.id,
                restaurant_id: restaurantId,
                restaurant_slug: restaurantSlug,
                restaurant_name: restaurantName,
                restaurant_logo_url: restaurantLogoUrl ?? null,
                name: item.name,
                price: item.price,
                image_url: item.image_urls?.[0] || item.image_url || null,
              }}
            />
          </div>
        )}

        {/* Stock faible (Premium) */}
        {stockLow && (
          <div className="absolute bottom-2 left-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'rgba(245,158,11,0.85)', color: '#fff' }}>
              Plus que {item.stock_quantity}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="font-semibold text-sm leading-tight mb-1" style={{ color: tokens.textPrimary }}>
          {item.name}
        </h3>
        {item.description && (
          <p className="text-xs leading-relaxed mb-2.5 line-clamp-2" style={{ color: tokens.textMuted }}>
            {item.description}
          </p>
        )}
        <div className="flex items-center justify-between">
          <div>
            {hasVariants && (
              <p className="text-[10px] font-medium mb-0.5" style={{ color: tokens.textMuted }}>À partir de</p>
            )}
            <span className="font-bold text-sm" style={{ color: tokens.accentText }}>
              {formatCurrency(minPrice)}
            </span>
          </div>
          {/* Visual affordance — tap to open */}
          <div
            className="text-xs font-medium px-2.5 py-1 rounded-full"
            style={{ backgroundColor: `${tokens.button}18`, color: tokens.button }}
          >
            Voir
          </div>
        </div>
      </div>
    </div>
  )
}
