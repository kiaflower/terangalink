'use client'

import Image from 'next/image'
import { Plus, Minus } from 'lucide-react'
import { useCart } from '@/lib/hooks/useCart'
import { formatCurrency } from '@/lib/utils'
import type { MenuItem } from '@/lib/types'
import type { ThemeTokens } from '@/lib/theme'

interface MenuCardProps {
  item: MenuItem
  restaurantId: string
  restaurantSlug: string
  restaurantPhone: string
  restaurantName: string
  tokens: ThemeTokens
}

export function MenuCard({ item, restaurantId, restaurantSlug, restaurantPhone, restaurantName, tokens }: MenuCardProps) {
  const { state, addItem, updateQty } = useCart()
  const cartItem = state.items.find(i => i.id === item.id)
  const qty = cartItem?.quantity ?? 0

  function handleAdd() {
    addItem(
      { id: item.id, name: item.name, price: item.price, quantity: 1, image_url: item.image_url },
      restaurantId, restaurantSlug, restaurantPhone, restaurantName
    )
  }

  return (
    <div
      className="group rounded-2xl overflow-hidden transition-all duration-200"
      style={{ backgroundColor: tokens.bgCard, border: `1px solid ${tokens.border}` }}
    >
      {/* Image */}
      <div className="relative w-full h-40 overflow-hidden" style={{ backgroundColor: tokens.bgCardHover }}>
        {item.image_url ? (
          <Image src={item.image_url} alt={item.name} fill className="object-cover group-hover:scale-105 transition-transform duration-300" sizes="(max-width: 640px) 50vw, 33vw" loading="lazy" unoptimized/>
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ backgroundColor: tokens.bgCardHover }}>
            <span className="text-4xl opacity-30">🍽️</span>
          </div>
        )}
        {!item.is_available && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <span className="text-white text-xs font-semibold bg-black/50 px-3 py-1 rounded-full">Indisponible</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-3.5">
        <h3 className="font-semibold text-sm leading-tight mb-1" style={{ color: tokens.textPrimary }}>{item.name}</h3>
        {item.description && (
          <p className="text-xs leading-relaxed mb-2.5 line-clamp-2" style={{ color: tokens.textMuted }}>{item.description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="font-bold text-sm" style={{ color: tokens.accentText }}>{formatCurrency(item.price)}</span>
          {item.is_available && (
            qty === 0 ? (
              <button onClick={handleAdd} className="w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-md" style={{ backgroundColor: tokens.accent }}>
                <Plus className="w-4 h-4 text-white" />
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button onClick={() => updateQty(item.id, qty - 1)} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: tokens.bgCardHover, border: `1px solid ${tokens.border}` }}>
                  <Minus className="w-3 h-3" style={{ color: tokens.textSecondary }} />
                </button>
                <span className="font-bold text-sm w-4 text-center" style={{ color: tokens.textPrimary }}>{qty}</span>
                <button onClick={handleAdd} className="w-7 h-7 rounded-full flex items-center justify-center transition-colors" style={{ backgroundColor: tokens.accent }}>
                  <Plus className="w-3 h-3 text-white" />
                </button>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}
