'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface FeaturedItem {
  boutique: {
    name: string
    slug: string
    logo_url?: string | null
    primary_color?: string | null
    city?: string | null
    shop_category?: string | null
  }
  products: Array<{
    name: string
    price: number
    image_url?: string | null
  }>
}

interface FeaturedBlockProps {
  title: string
  items: FeaturedItem[] // plusieurs boutiques
}

const TERANGA_VIOLET = '#F97316'

export function FeaturedBlock({ title, items }: FeaturedBlockProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef(0)
  const touchEndX = useRef(0)

  const total = items.length

  const goTo = useCallback((index: number) => {
    setActiveIndex((index + total) % total)
  }, [total])

  // Auto-glisse toutes les 4 secondes
  useEffect(() => {
    if (total <= 1) return
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % total)
    }, 4000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [total])

  // Reset timer quand on navigue manuellement
  function navigate(direction: 1 | -1) {
    if (timerRef.current) clearInterval(timerRef.current)
    goTo(activeIndex + direction)
    timerRef.current = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % total)
    }, 4000)
  }

  function handleTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX
  }
  function handleTouchEnd(e: React.TouchEvent) {
    touchEndX.current = e.changedTouches[0].clientX
    const diff = touchStartX.current - touchEndX.current
    if (Math.abs(diff) > 40) navigate(diff > 0 ? 1 : -1)
  }

  if (!items.length) return null
  const current = items[activeIndex]
  const accent = current.boutique.primary_color || TERANGA_VIOLET

  return (
    <div
      className="w-full overflow-hidden bg-white"
      style={{ borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Header titre — pleine largeur */}
      <div className="flex items-center justify-between px-4 pt-3 pb-2">
        <span className="text-[11px] font-bold uppercase tracking-widest"
          style={{ color: TERANGA_VIOLET }}>
          {title}
        </span>
        {total > 1 && (
          <div className="flex items-center gap-1">
            <button onClick={() => navigate(-1)}
              className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-200 hover:border-orange-300 transition-colors">
              <ChevronLeft className="w-3.5 h-3.5 text-gray-500" />
            </button>
            <span className="text-[10px] text-gray-400 px-1">{activeIndex + 1}/{total}</span>
            <button onClick={() => navigate(1)}
              className="w-6 h-6 rounded-full flex items-center justify-center border border-gray-200 hover:border-orange-300 transition-colors">
              <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
            </button>
          </div>
        )}
      </div>

      {/* Corps — layout horizontal logo + produits */}
      <div className="flex gap-0 transition-opacity duration-300">

        {/* Colonne gauche — logo + nom boutique */}
        <div className="w-[30%] flex-shrink-0 flex flex-col items-center justify-center px-3 py-3 gap-2">
          {current.boutique.logo_url
            ? // eslint-disable-next-line @next/next/no-img-element
              <img src={current.boutique.logo_url} alt={current.boutique.name}
                className="w-14 h-14 rounded-xl object-cover border border-gray-100" />
            : <div className="w-14 h-14 rounded-xl flex items-center justify-center text-white text-xl font-black"
                style={{ backgroundColor: accent }}>
                {current.boutique.name.charAt(0)}
              </div>
          }
          <div className="text-center">
            <p className="font-bold text-gray-900 text-xs leading-tight truncate max-w-[80px]">
              {current.boutique.name}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
              {current.boutique.shop_category}
            </p>
            <p className="text-[10px] text-gray-400 leading-tight">{current.boutique.city}</p>
          </div>
        </div>

        {/* Séparateur vertical */}
        <div className="w-px bg-gray-100 my-3" />

        {/* Colonne droite — produits 2×2 + bouton */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="grid grid-cols-2 gap-px bg-gray-100 flex-1">
            {current.products.slice(0, 4).map((p, i) => (
              <div key={i} className="bg-white p-2 flex gap-2 items-center">
                <div className="w-10 h-10 flex-shrink-0 rounded-lg overflow-hidden bg-gray-50">
                  {p.image_url
                    ? // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                    : <div className="w-full h-full" style={{ backgroundColor: `${accent}15` }} />
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-medium text-gray-800 truncate leading-tight">{p.name}</p>
                  <p className="text-[10px] font-bold leading-tight" style={{ color: accent }}>
                    {formatPrice(p.price)}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Bouton voir catalogue */}
          <Link href={`/${current.boutique.slug}?from=annuaire`}
            className="flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: accent }}>
            Voir le catalogue
            <ChevronRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Dots indicateurs */}
      {total > 1 && (
        <div className="flex justify-center gap-1.5 py-2">
          {items.map((_, i) => (
            <button key={i} onClick={() => goTo(i)}
              className="h-1.5 rounded-full transition-all duration-300"
              style={{
                width: i === activeIndex ? '16px' : '6px',
                backgroundColor: i === activeIndex ? TERANGA_VIOLET : '#E5E7EB',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
