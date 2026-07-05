import Image from 'next/image'
import Link from 'next/link'
import { MapPin, UtensilsCrossed } from 'lucide-react'
import type { RestaurantSummary } from '@/lib/taxonomy'
import { isOpenNow } from '@/lib/opening-hours'

export function RestaurantCardLite({ restaurant }: { restaurant: RestaurantSummary }) {
  const open = isOpenNow(restaurant.opening_hours)
  const image = restaurant.cover_url || restaurant.logo_url
  const locationLabel = [restaurant.neighborhood, restaurant.city].filter(Boolean).join(', ')

  return (
    <Link
      href={`/${restaurant.slug}`}
      className="group block rounded-2xl overflow-hidden bg-white border transition-shadow hover:shadow-lg"
      style={{ borderColor: restaurant.is_boosted ? '#F97316' : '#E5E7EB' }}
    >
      <div className="relative w-full h-40 bg-gray-100">
        {image ? (
          <Image
            src={image}
            alt={`Photo de ${restaurant.name}${locationLabel ? ` — ${locationLabel}` : ''}`}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <UtensilsCrossed className="w-8 h-8 text-gray-300" />
          </div>
        )}
        {restaurant.is_boosted && (
          <span className="absolute top-2 left-2 bg-brand-orange text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Recommandé
          </span>
        )}
        <span
          className="absolute top-2 right-2 text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{ backgroundColor: open ? '#16A34A' : '#374151', color: '#FFFFFF' }}
        >
          {open ? 'Ouvert' : 'Fermé'}
        </span>
      </div>
      <div className="p-3">
        <h3 className="font-semibold text-gray-900 text-sm truncate">{restaurant.name}</h3>
        {locationLabel && (
          <p className="text-xs text-gray-500 flex items-center gap-1 mt-1">
            <MapPin className="w-3 h-3 shrink-0" />
            <span className="truncate">{locationLabel}</span>
          </p>
        )}
        {restaurant.cuisine_type && (
          <p className="text-xs text-gray-400 mt-1 truncate">{restaurant.cuisine_type}</p>
        )}
      </div>
    </Link>
  )
}
