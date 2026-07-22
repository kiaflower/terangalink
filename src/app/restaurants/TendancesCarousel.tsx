'use client'

import Link from 'next/link'
import { Flame } from 'lucide-react'

export interface TrendItem {
  restaurant_slug: string
  restaurant_name: string
  product_name: string
  product_image: string | null
  product_price: number
  order_count: number
}

interface Props {
  items: TrendItem[]
}

export function TendancesCarousel({ items }: Props) {
  if (!items.length) return null

  // Duplicate for seamless marquee
  const doubled = [...items, ...items]

  return (
    <div className="bg-white border-b border-gray-100 py-4 overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 mb-3 flex items-center gap-2">
        <Flame className="w-4 h-4 text-orange-500" />
        <span className="text-xs font-bold text-gray-700 uppercase tracking-wider">Tendances</span>
      </div>
      <div className="relative overflow-hidden">
        <div className="flex gap-3 tendances-marquee">
          {doubled.map((item, i) => (
            <Link
              key={`${item.restaurant_slug}-${i}`}
              href={`/${item.restaurant_slug}?from=annuaire`}
              className="flex-shrink-0 flex items-center gap-3 bg-gray-50 hover:bg-orange-50 border border-gray-100 hover:border-orange-200 rounded-2xl px-4 py-3 transition-all group min-w-[220px]"
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-200 flex-shrink-0">
                {item.product_image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.product_image} alt={item.product_name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs font-bold">
                    {item.restaurant_name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-gray-900 truncate group-hover:text-orange-700 transition-colors">
                  {item.product_name}
                </p>
                <p className="text-xs text-gray-400 truncate">{item.restaurant_name}</p>
                <p className="text-xs font-semibold text-orange-600 mt-0.5">
                  {new Intl.NumberFormat('fr-SN').format(item.product_price)} FCFA
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
