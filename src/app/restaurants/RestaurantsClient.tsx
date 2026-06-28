'use client'

import { useState, useMemo, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Search, MapPin, Star, UtensilsCrossed, Zap, MessageCircle, ArrowRight } from 'lucide-react'
import { CUISINE_FILTER_OPTIONS } from '@/lib/cuisines'

interface Restaurant {
  id: string
  name: string
  slug: string
  description: string | null
  city: string | null
  cuisine_type: string | null
  logo_url: string | null
  cover_url: string | null
  rating: number | null
  review_count: number
  is_boosted?: boolean
  is_new?: boolean
  rank_score?: number
  created_at?: string
}

interface MenuItem {
  restaurant_id: string
  name: string
  description: string | null
}

const CITIES = [
  'Toutes les régions',
  'Dakar', 'Thiès', 'Diourbel', 'Fatick', 'Kaolack', 'Kaffrine',
  'Saint-Louis', 'Louga', 'Matam',
  'Tambacounda', 'Kédougou',
  'Ziguinchor', 'Sédhiou', 'Kolda',
]
const CUISINES = CUISINE_FILTER_OPTIONS

const HERO_IMAGE = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1600&q=80'

function RestaurantCard({ restaurant, onTrackClick }: { restaurant: Restaurant; onTrackClick: (id: string) => void }) {
  const isNew = restaurant.is_new ?? false
  const isBoosted = restaurant.is_boosted

  return (
    <Link
      href={`/${restaurant.slug}?from=annuaire`}
      onClick={() => onTrackClick(restaurant.id)}
      className="group block rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1"
      style={{
        backgroundColor: '#FFFFFF',
        border: isBoosted ? '2px solid #F97316' : '1px solid #E5E7EB',
        boxShadow: isBoosted
          ? '0 0 0 3px rgba(249,115,22,0.08), 0 2px 8px rgba(0,0,0,0.06)'
          : '0 1px 4px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = isBoosted ? '0 0 0 3px rgba(249,115,22,0.08), 0 2px 8px rgba(0,0,0,0.06)' : '0 1px 4px rgba(0,0,0,0.06)' }}
    >
      {/* Badge boost */}
      {isBoosted && (
        <div className="flex items-center gap-1.5 px-3 py-1.5"
          style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
          <span className="text-xs font-bold" style={{ color: '#EA580C' }}>Recommandé</span>
        </div>
      )}

      {/* Photo + logo overlay */}
      <div className="relative w-full overflow-visible" style={{ height: 160, backgroundColor: '#F3F4F6' }}>
        <div className="absolute inset-0 overflow-hidden rounded-t-2xl">
          {restaurant.cover_url || restaurant.logo_url ? (
            <Image
              src={restaurant.cover_url || restaurant.logo_url!}
              alt={restaurant.name}
              fill
              className="object-cover transition-transform duration-500 group-hover:scale-105"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              unoptimized
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <UtensilsCrossed className="w-8 h-8" style={{ color: '#D1D5DB' }} />
            </div>
          )}
          {/* Gradient bas de photo */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 60%)' }} />
        </div>

        {/* Logo overlay — chevauche la bordure image/contenu */}
        <div className="absolute z-10" style={{ bottom: -16, left: 12 }}>
          {restaurant.logo_url ? (
            <img
              src={restaurant.logo_url}
              alt={`Logo ${restaurant.name}`}
              className="w-12 h-12 rounded-xl object-cover"
              style={{ border: '2px solid #FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg text-white"
              style={{ backgroundColor: '#F97316', border: '2px solid #FFFFFF', boxShadow: '0 2px 8px rgba(0,0,0,0.18)' }}
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Badge note ou Nouveau */}
        <div className="absolute top-2 right-2 z-10">
          {!isNew && restaurant.rating ? (
            <div className="flex items-center gap-1 px-2 py-1 rounded-full"
              style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}>
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              <span className="text-xs font-bold text-white">{restaurant.rating.toFixed(1)}</span>
            </div>
          ) : isNew ? (
            <span className="text-xs font-bold px-2 py-1 rounded-full text-white"
              style={{ backgroundColor: '#F97316' }}>
              Nouveau
            </span>
          ) : null}
        </div>
      </div>

      {/* Infos — padding-top pour compenser le logo overlay qui déborde de 16px */}
      <div className="p-3 sm:p-4 pt-6">
        <h3 className="font-bold text-sm leading-tight mb-1 transition-colors group-hover:text-orange-500"
          style={{ color: '#111111' }}>
          {restaurant.name}
        </h3>

        <div className="flex items-center gap-1.5 mb-3 flex-wrap">
          {restaurant.city && (
            <div className="flex items-center gap-0.5">
              <MapPin className="w-3 h-3" style={{ color: '#9CA3AF' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>{restaurant.city}</span>
            </div>
          )}
          {restaurant.city && restaurant.cuisine_type && (
            <span className="text-xs" style={{ color: '#D1D5DB' }}>·</span>
          )}
          {restaurant.cuisine_type && (
            <span className="text-xs" style={{ color: '#9CA3AF' }}>{restaurant.cuisine_type}</span>
          )}
        </div>

        <div className="flex items-center justify-between">
          {!isNew && restaurant.rating && restaurant.review_count > 0 ? (
            <div className="flex items-center gap-1">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="text-sm font-bold" style={{ color: '#111111' }}>{restaurant.rating.toFixed(1)}</span>
              <span className="text-xs" style={{ color: '#9CA3AF' }}>({restaurant.review_count})</span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: '#D1D5DB' }}>Pas encore d&apos;avis</span>
          )}
          <span className="text-xs font-semibold px-2 py-1 rounded-lg"
            style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: '#F97316' }}>
            Commander →
          </span>
        </div>
      </div>
    </Link>
  )
}

function trackEvent(event_type: string, restaurant_id?: string) {
  fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurant_id: restaurant_id ?? null, event_type }),
  }).catch(() => {})
}

export default function RestaurantsClient({ restaurants, menuItems }: { restaurants: Restaurant[]; menuItems: MenuItem[] }) {
  const [query, setQuery] = useState('')
  const [city, setCity] = useState('Toutes les régions')
  const [cuisine, setCuisine] = useState('Tous les types')

  // Tracker la vue de l'annuaire au chargement
  useEffect(() => {
    trackEvent('directory_view')
  }, [])

  // Index des plats par restaurant (calculé une seule fois)
  const menuIndex = useMemo(() => {
    const index: Record<string, string> = {}
    for (const item of menuItems) {
      const existing = index[item.restaurant_id] ?? ''
      index[item.restaurant_id] = existing + ' ' + item.name + ' ' + (item.description ?? '')
    }
    return index
  }, [menuItems])

  const filtered = useMemo(() => {
    return restaurants
      .filter(r => {
        const q = query.toLowerCase().trim()
        const matchQuery = !q ||
          r.name.toLowerCase().includes(q) ||
          (r.description ?? '').toLowerCase().includes(q) ||
          (r.city ?? '').toLowerCase().includes(q) ||
          (r.cuisine_type ?? '').toLowerCase().includes(q) ||
          (menuIndex[r.id] ?? '').toLowerCase().includes(q)
        const matchCity = city === 'Toutes les régions' || (r.city ?? '').toLowerCase().includes(city.toLowerCase())
        const matchCuisine = cuisine === 'Tous les types' || (r.cuisine_type ?? '').toLowerCase().includes(cuisine.toLowerCase())
        return matchQuery && matchCity && matchCuisine
      })
      // Le tri est déjà appliqué côté serveur (boostés → nouveaux → score)
      // On préserve cet ordre après filtrage

  }, [restaurants, query, city, cuisine])

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>

      {/* ── Hero avec image de fond ── */}
      <div className="relative flex flex-col items-center justify-end" style={{ minHeight: '60vh', paddingTop: '56px' }}>

        {/* Image de fond */}
        <div className="absolute inset-0 overflow-hidden">
          <Image
            src={HERO_IMAGE}
            alt="Plats sénégalais"
            fill
            className="object-cover"
            priority
            unoptimized
          />
          {/* Overlay — image assombrie */}
          <div className="absolute inset-0"
            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.80) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.45) 100%)' }} />
        </div>

        {/* Header blanc fixe */}
        <div className="fixed top-0 left-0 right-0 z-50 px-4 py-3" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
              <span className="font-bold text-lg" style={{ color: '#111111' }}>Teranga<span style={{ color: '#F97316' }}>Link</span></span>
            </Link>
            <Link href="/pour-les-restaurants"
              className="text-xs font-semibold px-4 py-2 rounded-xl transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#F97316', color: '#FFFFFF' }}>
              Mon restaurant →
            </Link>
          </div>
        </div>

        {/* Contenu centré dans le hero */}
        <div className="relative z-10 w-full max-w-3xl mx-auto px-4 pb-10 text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 mb-4 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: '#F97316', color: '#FFFFFF' }}>
            Restaurants au Sénégal
          </div>
          <h1 className="font-black text-4xl sm:text-5xl text-white mb-3 leading-tight">
            {(() => {
              const h = new Date().getHours()
              if (h < 11) return <>Quoi manger <span style={{ color: '#FB923C' }}>ce matin ?</span></>
              if (h < 15) return <>Quoi manger <span style={{ color: '#FB923C' }}>ce midi ?</span></>
              if (h < 18) return <>Quoi manger <span style={{ color: '#FB923C' }}>cet après-midi ?</span></>
              return <>Quoi manger <span style={{ color: '#FB923C' }}>ce soir ?</span></>
            })()}
          </h1>
          <p className="text-white/80 mb-6 text-base sm:text-lg">
            Restaurants, traiteurs, pâtisseries — commandez directement via WhatsApp
          </p>

          {/* Barre de recherche */}
          <div className="max-w-xl mx-auto space-y-3">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: '#9CA3AF' }} />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Rechercher un restaurant, un plat, une ville..."
                className="w-full pl-12 pr-4 py-4 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 shadow-lg"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#111111',
                  backdropFilter: 'blur(8px)',
                }}
              />
            </div>

            {/* Filtres */}
            <div className="flex gap-2 flex-wrap justify-center">
              <div className="relative">
                <select
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none shadow-sm"
                  style={{
                    backgroundColor: city !== 'Toutes les régions' ? '#FFF7ED' : 'rgba(255,255,255,0.92)',
                    color: city !== 'Toutes les régions' ? '#EA580C' : '#6B7280',
                    border: `1px solid ${city !== 'Toutes les régions' ? '#FED7AA' : 'rgba(255,255,255,0.4)'}`,
                  }}
                >
                  {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <MapPin className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                  style={{ color: city !== 'Toutes les régions' ? '#EA580C' : '#9CA3AF' }} />
              </div>

              <div className="relative">
                <select
                  value={cuisine}
                  onChange={e => setCuisine(e.target.value)}
                  className="appearance-none pl-3 pr-7 py-2 rounded-xl text-xs font-semibold cursor-pointer focus:outline-none shadow-sm"
                  style={{
                    backgroundColor: cuisine !== 'Tous les types' ? '#FFF7ED' : 'rgba(255,255,255,0.92)',
                    color: cuisine !== 'Tous les types' ? '#EA580C' : '#6B7280',
                    border: `1px solid ${cuisine !== 'Tous les types' ? '#FED7AA' : 'rgba(255,255,255,0.4)'}`,
                  }}
                >
                  {CUISINES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <UtensilsCrossed className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none"
                  style={{ color: cuisine !== 'Tous les types' ? '#EA580C' : '#9CA3AF' }} />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Grille des restaurants ── */}
      <div className="max-w-6xl mx-auto px-4 py-10 pb-20">
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <UtensilsCrossed className="w-10 h-10 mx-auto mb-4" style={{ color: '#D1D5DB' }} />
            <p className="font-semibold" style={{ color: '#374151' }}>Aucun restaurant trouvé</p>
            <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>Essayez d&apos;autres filtres</p>
          </div>
        ) : (
          <>
            <p className="text-xs mb-5" style={{ color: '#9CA3AF' }}>
              {filtered.length} restaurant{filtered.length > 1 ? 's' : ''}
              {query && ` pour "${query}"`}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
              {filtered.map(r => (
                <RestaurantCard key={r.id} restaurant={r} onTrackClick={id => trackEvent('directory_click', id)} />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── CTA restaurateurs ── */}
      <div className="text-white py-16 text-center" style={{ backgroundColor: '#F97316' }}>
        <div className="max-w-2xl mx-auto px-4">
          <p className="text-sm font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.75)' }}>
            Vous êtes restaurateur ?
          </p>
          <h2 className="text-2xl sm:text-3xl font-black mb-3">
            Rejoignez l&apos;annuaire TerangaLink
          </h2>
          <p className="text-sm mb-6 max-w-md mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
            Vos futurs clients vous cherchent ici. Créez votre restaurant en moins de 24h.
          </p>
          <Link
            href="/pour-les-restaurants#tarifs"
            className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl transition-all hover:opacity-90 group"
            style={{ backgroundColor: '#FFFFFF', color: '#F97316' }}
          >
            Découvrir les offres
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>

    </div>
  )
}
