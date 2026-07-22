'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Heart, Store, ArrowRight, Package } from 'lucide-react'
import { formatPrice } from '@/lib/utils'
import { Logo } from '@/components/ui/Logo'

interface FavoriteItem {
  product_id: string
  restaurant_slug: string
  restaurant_name: string
  name: string
  image_url: string | null
  price: number
}

interface AnnuaireSuggestion {
  id: string
  slug: string
  name: string
  price: number
  discount_percent: number | null
  image_url: string | null
  restaurant_slug: string
  restaurant_name: string
}

const FAVORITES_KEY = 'terangalink_favorites'

export default function FavorisPage() {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<AnnuaireSuggestion[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(FAVORITES_KEY)
      if (raw) setFavorites(JSON.parse(raw))
    } catch { /* ignore */ }
  }, [])

  // Boucle de découverte de l'annuaire — uniquement pour les visiteurs venant
  // d'un restaurant en plan Free (voir RestaurantPageClient, lien "Mes favoris").
  useEffect(() => {
    const isFreeSource = new URLSearchParams(window.location.search).get('src') === 'free'
    setShowSuggestions(isFreeSource)
    if (!isFreeSource) return
    fetch('/api/annuaire/suggestions')
      .then(res => res.json())
      .then(data => setSuggestions((data.products ?? []).slice(0, 3)))
      .catch(() => {})
  }, [])

  function remove(productId: string) {
    const next = favorites.filter(f => f.product_id !== productId)
    setFavorites(next)
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(next))
  }

  // Group by restaurant
  const byRestaurant = favorites.reduce<Record<string, { slug: string; name: string; items: FavoriteItem[] }>>((acc, f) => {
    if (!acc[f.restaurant_slug]) acc[f.restaurant_slug] = { slug: f.restaurant_slug, name: f.restaurant_name, items: [] }
    acc[f.restaurant_slug].items.push(f)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="px-6 py-5 flex items-center justify-between bg-white" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <Link href="/"><Logo textClassName="font-bold text-xl" textStyle={{ color: '#111111' }} /></Link>
        <Link href="/restaurants" className="text-sm text-gray-500 hover:text-brand-orange transition-colors flex items-center gap-1.5">
          <Store className="w-4 h-4" /> Annuaire
        </Link>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-bold text-gray-900">Mes favoris</h1>
          <span className="text-sm text-gray-400">({favorites.length})</span>
        </div>

        {favorites.length === 0 ? (
          <div className="text-center py-24">
            <Heart className="w-12 h-12 text-gray-200 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">Aucun favori pour l&apos;instant</p>
            <p className="text-gray-400 text-sm mt-1 mb-6">Ajoutez des plats en cliquant sur le cœur sur les vitrines</p>
            <Link href="/restaurants"
              className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              <Store className="w-4 h-4" /> Découvrir les restaurants
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.values(byRestaurant).map(group => (
              <div key={group.slug}>
                <Link href={`/${group.slug}`}
                  className="inline-flex items-center gap-2 text-sm font-bold text-gray-900 hover:text-brand-orange transition-colors mb-4">
                  {group.name}
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {group.items.map(item => (
                    <div key={item.product_id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden group">
                      <div className="relative aspect-square bg-gray-50">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-8 h-8 text-gray-300" />
                          </div>
                        )}
                        <button
                          onClick={() => remove(item.product_id)}
                          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center hover:bg-white transition-colors">
                          <Heart className="w-4 h-4 fill-red-500 text-red-500" />
                        </button>
                      </div>
                      <div className="p-3">
                        <h3 className="text-sm font-semibold text-gray-900 truncate">{item.name}</h3>
                        <p className="text-sm font-bold text-brand-orange mt-1">{formatPrice(item.price)}</p>
                        <Link href={`/${item.restaurant_slug}`}
                          className="mt-2 w-full flex items-center justify-center gap-1 text-xs font-semibold py-2 rounded-lg border border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-colors">
                          Voir le restaurant
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showSuggestions && suggestions.length > 0 && (
          <div className="mt-10">
            <h2 className="text-sm font-bold text-gray-900 mb-3">Découvrez d&apos;autres restaurants</h2>
            <div className="grid grid-cols-3 gap-3 mb-4">
              {suggestions.map(p => (
                <Link key={p.id} href={`/${p.restaurant_slug}/plat/${p.slug}`}
                  className="rounded-xl overflow-hidden border border-gray-100 bg-white hover:shadow-md transition-shadow">
                  <div className="aspect-square relative bg-gray-50">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-6 h-6 text-gray-300" /></div>
                    )}
                  </div>
                  <div className="p-2.5">
                    <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs font-bold mt-0.5 text-brand-orange">{formatPrice(p.price)}</p>
                    <p className="text-[10px] text-gray-400 truncate mt-0.5">{p.restaurant_name}</p>
                  </div>
                </Link>
              ))}
            </div>
            <Link href="/restaurants"
              className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity">
              <Store className="w-4 h-4" /> Découvrir l&apos;annuaire
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
