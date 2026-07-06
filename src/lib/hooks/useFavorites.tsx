'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react'
import type { FavoriteItem } from '@/lib/types'

const FAVORITES_KEY = 'tl_favorites'

function itemKey(type: FavoriteItem['type'], id: string): string {
  return `${type}:${id}`
}

function readFavorites(): FavoriteItem[] {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    // Tolère les entrées d'un ancien format sans discriminant `type` (avant l'ajout des favoris restaurants)
    return parsed.filter((item): item is FavoriteItem => item && (item.type === 'restaurant' || item.type === 'product'))
  } catch {
    return []
  }
}

function writeFavorites(favorites: FavoriteItem[]) {
  try {
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites))
  } catch {
    /* localStorage indisponible — pas bloquant */
  }
}

interface FavoritesContextType {
  favorites: FavoriteItem[]
  isFavorite: (type: FavoriteItem['type'], id: string) => boolean
  toggleFavorite: (item: Omit<FavoriteItem, 'added_at'>) => void
  removeFavorite: (type: FavoriteItem['type'], id: string) => void
}

const FavoritesContext = createContext<FavoritesContextType | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])

  useEffect(() => {
    setFavorites(readFavorites())
  }, [])

  const isFavorite = useCallback(
    (type: FavoriteItem['type'], id: string) => favorites.some(f => f.type === type && f.id === id),
    [favorites]
  )

  const toggleFavorite = useCallback((item: Omit<FavoriteItem, 'added_at'>) => {
    setFavorites(current => {
      const exists = current.some(f => f.type === item.type && f.id === item.id)
      const next = exists
        ? current.filter(f => itemKey(f.type, f.id) !== itemKey(item.type, item.id))
        : [...current, { ...item, added_at: new Date().toISOString() } as FavoriteItem]
      writeFavorites(next)
      return next
    })
  }, [])

  const removeFavorite = useCallback((type: FavoriteItem['type'], id: string) => {
    setFavorites(current => {
      const next = current.filter(f => !(f.type === type && f.id === id))
      writeFavorites(next)
      return next
    })
  }, [])

  return (
    <FavoritesContext.Provider value={{ favorites, isFavorite, toggleFavorite, removeFavorite }}>
      {children}
    </FavoritesContext.Provider>
  )
}

export function useFavorites() {
  const ctx = useContext(FavoritesContext)
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider')
  return ctx
}
