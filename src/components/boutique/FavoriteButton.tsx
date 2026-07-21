'use client'

import { useState, useEffect } from 'react'
import { Heart } from 'lucide-react'

interface FavoriteItem {
  product_id: string
  boutique_slug: string
  boutique_name: string
  name: string
  image_url: string | null
  price: number
}

const KEY = 'terangaspot_favorites'

function getFavorites(): FavoriteItem[] {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') } catch { return [] }
}

interface Props {
  productId: string
  boutiqueSlug: string
  boutiqueName: string
  name: string
  imageUrl: string | null
  price: number
}

export function FavoriteButton({ productId, boutiqueSlug, boutiqueName, name, imageUrl, price }: Props) {
  const [isFav, setIsFav] = useState(false)

  useEffect(() => {
    const favs = getFavorites()
    setIsFav(favs.some(f => f.product_id === productId))
  }, [productId])

  function toggle(e: React.MouseEvent) {
    e.preventDefault()
    e.stopPropagation()
    const favs = getFavorites()
    const exists = favs.some(f => f.product_id === productId)
    const next: FavoriteItem[] = exists
      ? favs.filter(f => f.product_id !== productId)
      : [...favs, { product_id: productId, boutique_slug: boutiqueSlug, boutique_name: boutiqueName, name, image_url: imageUrl, price }]
    localStorage.setItem(KEY, JSON.stringify(next))
    setIsFav(!exists)
  }

  return (
    <button
      onClick={toggle}
      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center z-10 hover:bg-white transition-colors"
      aria-label={isFav ? 'Retirer des favoris' : 'Ajouter aux favoris'}>
      <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
    </button>
  )
}
