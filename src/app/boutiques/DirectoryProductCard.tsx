'use client'

import Link from 'next/link'
import { formatPrice, applyDiscount } from '@/lib/utils'
import { VerifiedBadge } from '@/components/ui/VerifiedBadge'
import { FounderBadge } from '@/components/ui/FounderBadge'
import { FavoriteButton } from '@/components/boutique/FavoriteButton'

interface Props {
  product: {
    id: string
    slug: string
    name: string
    price: number
    discount_percent: number | null
    image_url: string | null
  }
  boutique: {
    id: string
    slug: string
    name: string
    logo_url: string | null
    city: string | null
    is_verified: boolean
    is_founder: boolean
  }
}

export function DirectoryProductCard({ product: p, boutique: b }: Props) {
  function trackClick() {
    fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boutique_id: b.id, event_type: 'directory_click', item_id: p.id, item_name: p.name }),
    }).catch(() => {})
  }

  const price = applyDiscount(p.price, p.discount_percent)
  const hasDiscount = !!p.discount_percent

  return (
    <Link
      href={`/${b.slug}/produit/${p.slug}?from=annuaire`}
      onClick={trackClick}
      className="group rounded-2xl overflow-hidden border border-gray-200 hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 bg-white"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-100">
        <FavoriteButton
          productId={p.id}
          boutiqueSlug={b.slug}
          boutiqueName={b.name}
          name={p.name}
          imageUrl={p.image_url}
          price={p.price}
        />
        {p.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={p.image_url} alt={p.name} loading="lazy" decoding="async"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-white text-3xl font-black"
            style={{ backgroundColor: '#F97316' }}>
            {p.name.charAt(0)}
          </div>
        )}
        {hasDiscount && (
          <span className="absolute top-2.5 left-2.5 text-xs font-bold px-2.5 py-1 rounded-full text-white bg-red-500">
            -{p.discount_percent}%
          </span>
        )}
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-bold text-sm sm:text-base text-gray-900 truncate group-hover:text-brand-orange transition-colors">
          {p.name}
        </h3>
        <div className="flex items-center gap-1.5 mt-1">
          {hasDiscount && (
            <span className="text-xs text-gray-400 line-through">{formatPrice(p.price)}</span>
          )}
          <span className="text-sm font-bold" style={{ color: '#F97316' }}>{formatPrice(price)}</span>
        </div>

        <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-gray-100">
          {b.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={b.logo_url} alt="" loading="lazy" decoding="async" className="w-5 h-5 rounded-md object-cover flex-shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
              style={{ backgroundColor: '#F97316' }}>
              {b.name.charAt(0)}
            </div>
          )}
          <p className="text-xs text-gray-500 truncate flex-1">{b.name}</p>
          {b.is_founder ? (
            <FounderBadge label="" />
          ) : b.is_verified ? (
            <VerifiedBadge label="" className="text-gray-600" />
          ) : null}
        </div>
      </div>
    </Link>
  )
}
