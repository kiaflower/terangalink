'use client'

import { Heart } from 'lucide-react'
import { useFavorites } from '@/lib/hooks/useFavorites'
import type { FavoriteItem } from '@/lib/types'

interface FavoriteButtonProps {
  item: Omit<FavoriteItem, 'added_at'>
  className?: string
}

export function FavoriteButton({ item, className }: FavoriteButtonProps) {
  const { isFavorite, toggleFavorite } = useFavorites()
  const active = isFavorite(item.type, item.id)

  return (
    <button
      onClick={e => { e.stopPropagation(); e.preventDefault(); toggleFavorite(item) }}
      className={`w-8 h-8 rounded-full flex items-center justify-center transition-transform active:scale-90 ${className ?? ''}`}
      style={{ backgroundColor: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
      title={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <Heart className="w-4 h-4" style={{ color: active ? '#F97316' : 'white', fill: active ? '#F97316' : 'none' }} />
    </button>
  )
}
