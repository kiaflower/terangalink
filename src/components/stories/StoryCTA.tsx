'use client'

import Link from 'next/link'
import { ShoppingCart, UtensilsCrossed } from 'lucide-react'
import type { StoryMenuItemSummary } from '@/lib/types'

interface StoryCTAProps {
  restaurantSlug: string
  menuItem: StoryMenuItemSummary | null
}

export function StoryCTA({ restaurantSlug, menuItem }: StoryCTAProps) {
  const href = menuItem
    ? `/${restaurantSlug}?story_product=${menuItem.id}`
    : `/${restaurantSlug}?from=story`

  return (
    <Link
      href={href}
      className="flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl font-bold text-sm text-white shadow-lg transition-transform active:scale-[0.98]"
      style={{ backgroundColor: '#F97316' }}
    >
      {menuItem ? <ShoppingCart className="w-4 h-4" /> : <UtensilsCrossed className="w-4 h-4" />}
      {menuItem ? 'Commander' : 'Voir le menu'}
    </Link>
  )
}
