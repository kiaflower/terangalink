'use client'

import { useRef, useState, type PointerEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { Boutique, ProductCategory, ProductWithVariants } from '@/lib/types'
import { BoutiquePhoneDemo } from './BoutiquePhoneDemo'

interface DemoEntry {
  boutique: Boutique
  categories: ProductCategory[]
  products: ProductWithVariants[]
  reviews: { id: string; customer_name: string | null; rating: number; comment: string | null; created_at: string }[]
  banners: { id: string; text: string }[]
  plan: 'starter' | 'pro'
}

// Un seul téléphone visible à la fois (mobile comme desktop) : les deux démos sont
// posées côte à côte horizontalement et l'utilisateur glisse (tactile, trackpad, ou
// glisser-déposer à la souris) pour passer de l'une à l'autre.
export function BoutiqueDemoCarousel({ entries }: { entries: DemoEntry[] }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startX: number; startScroll: number; dragging: boolean } | null>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  function scrollToIndex(index: number) {
    const track = trackRef.current
    if (!track) return
    const clamped = Math.max(0, Math.min(entries.length - 1, index))
    track.scrollTo({ left: clamped * track.clientWidth, behavior: 'smooth' })
  }

  function handleScroll() {
    const track = trackRef.current
    if (!track || track.clientWidth === 0) return
    setActiveIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track) return
    drag.current = { startX: e.clientX, startScroll: track.scrollLeft, dragging: true }
    track.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const track = trackRef.current
    if (!track || !drag.current?.dragging) return
    track.scrollLeft = drag.current.startScroll - (e.clientX - drag.current.startX)
  }

  function onPointerUp() {
    const track = trackRef.current
    if (drag.current) drag.current.dragging = false
    if (track) scrollToIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  if (entries.length === 0) return null

  return (
    <div className="relative w-full max-w-xs mx-auto select-none">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        className="flex overflow-x-auto snap-x snap-mandatory cursor-grab active:cursor-grabbing touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {entries.map(entry => (
          <div key={entry.boutique.id} className="flex-shrink-0 w-full snap-center flex justify-center">
            <BoutiquePhoneDemo
              boutique={entry.boutique}
              categories={entry.categories}
              products={entry.products}
              reviews={entry.reviews}
              banners={entry.banners}
              plan={entry.plan}
            />
          </div>
        ))}
      </div>

      {entries.length > 1 && (
        <>
          <button type="button" onClick={() => scrollToIndex(activeIndex - 1)} disabled={activeIndex === 0}
            aria-label="Boutique précédente"
            className="absolute left-0 top-[45%] -translate-y-1/2 -translate-x-3 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronLeft className="w-4 h-4 text-gray-700" />
          </button>
          <button type="button" onClick={() => scrollToIndex(activeIndex + 1)} disabled={activeIndex === entries.length - 1}
            aria-label="Boutique suivante"
            className="absolute right-0 top-[45%] -translate-y-1/2 translate-x-3 w-9 h-9 rounded-full bg-white shadow-md border border-gray-200 flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed">
            <ChevronRight className="w-4 h-4 text-gray-700" />
          </button>
          <div className="flex items-center justify-center gap-2 mt-5">
            {entries.map((entry, i) => (
              <button key={entry.boutique.id} type="button" onClick={() => scrollToIndex(i)}
                aria-label={`Voir la boutique ${i + 1}`}
                className="h-1.5 rounded-full transition-all"
                style={{ width: i === activeIndex ? 20 : 6, backgroundColor: i === activeIndex ? '#F97316' : '#D1D5DB' }} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
