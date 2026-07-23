'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { ZoomIn, Package } from 'lucide-react'
import { ImageLightbox } from '@/components/ui/ImageLightbox'

interface ProductGalleryProps {
  images: string[]
  // Photo de la variante actuellement sélectionnée (optionnelle) — une photo
  // parmi les autres (position stable, jamais déplacée en premier) ; la
  // sélectionner fait glisser la galerie jusqu'à elle.
  variantImage?: string | null
  productName: string
  cardBg: string
  // 'page' = page plat dédiée (grande zone + vignettes en grille).
  // 'modal' = aperçu rapide vitrine (bande défilante compacte, existant).
  variant?: 'page' | 'modal'
}

export function ProductGallery({ images, variantImage, productName, cardBg, variant = 'page' }: ProductGalleryProps) {
  // Ordre stable : les photos du plat, puis celle de la variante sélectionnée
  // si elle n'y figure pas déjà — jamais réordonné au changement de variante,
  // seul l'index actif bouge (avec un défilement animé) pour y accéder.
  const photos = variantImage && !images.includes(variantImage) ? [...images, variantImage] : images
  const [index, setIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)
  const stripRef = useRef<HTMLDivElement>(null)
  const thumbRefs = useRef<Record<number, HTMLButtonElement | null>>({})

  // Glisse jusqu'à la photo de la variante sélectionnée, sans réordonner la
  // liste — un vrai scroll animé plutôt qu'un saut instantané.
  useEffect(() => {
    if (!variantImage) return
    const i = photos.indexOf(variantImage)
    if (i === -1 || i === index) return
    setIndex(i)
    stripRef.current?.scrollTo({ left: i * stripRef.current.clientWidth, behavior: 'smooth' })
    thumbRefs.current[i]?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variantImage])

  if (photos.length === 0) {
    return (
      <div className="aspect-square rounded-2xl flex items-center justify-center" style={{ backgroundColor: cardBg }}>
        <Package className="w-12 h-12 text-gray-300" />
      </div>
    )
  }

  if (variant === 'modal') {
    return (
      <div className="relative">
        <div
          ref={stripRef}
          className="flex overflow-x-auto snap-x snap-mandatory rounded-t-2xl aspect-square"
          style={{ scrollbarWidth: 'none' }}
          onScroll={e => {
            const el = e.currentTarget
            const i = Math.round(el.scrollLeft / el.clientWidth)
            if (i !== index) setIndex(i)
          }}
        >
          {photos.map((url, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url + i} src={url} alt={productName}
              onClick={() => setZoomOpen(true)}
              className="w-full h-full object-cover flex-shrink-0 snap-center cursor-zoom-in" />
          ))}
        </div>
        {photos.length > 1 && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <span key={i} className="w-1.5 h-1.5 rounded-full transition-colors"
                style={{ backgroundColor: i === index ? '#fff' : 'rgba(255,255,255,0.5)' }} />
            ))}
          </div>
        )}
        <button type="button" onClick={() => setZoomOpen(true)}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          aria-label="Zoomer sur l'image">
          <ZoomIn className="w-4 h-4" />
        </button>
        {zoomOpen && (
          <ImageLightbox images={photos} index={index} alt={productName} onClose={() => setZoomOpen(false)} onIndexChange={setIndex} />
        )}
      </div>
    )
  }

  return (
    <div>
      <div className="relative rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg }}>
        <div
          ref={stripRef}
          className="flex overflow-x-auto snap-x snap-mandatory aspect-[4/5] sm:aspect-square"
          style={{ scrollbarWidth: 'none' }}
          onScroll={e => {
            const el = e.currentTarget
            const i = Math.round(el.scrollLeft / el.clientWidth)
            if (i !== index) setIndex(i)
          }}
        >
          {photos.map((url, i) => (
            <div key={url + i} className="relative w-full flex-shrink-0 snap-center">
              <Image
                src={url}
                alt={`${productName}${i > 0 ? ` — image ${i + 1}` : ''}`}
                fill
                sizes="(max-width: 768px) 100vw, 60vw"
                priority={i === 0}
                className="object-cover object-top"
              />
            </div>
          ))}
        </div>
        <button type="button" onClick={() => setZoomOpen(true)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          aria-label="Zoomer sur l'image">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 mt-2 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
          {photos.map((url, i) => (
            <button key={url + i} type="button" ref={el => { thumbRefs.current[i] = el }}
              onClick={() => {
                setIndex(i)
                stripRef.current?.scrollTo({ left: i * stripRef.current.clientWidth, behavior: 'smooth' })
              }}
              className="relative w-16 h-16 rounded-lg overflow-hidden transition-opacity flex-shrink-0"
              style={{ backgroundColor: cardBg, opacity: i === index ? 1 : 0.6 }}
            >
              <Image src={url} alt={`${productName} — image ${i + 1}`} fill sizes="64px" className="object-cover object-top" />
            </button>
          ))}
        </div>
      )}
      {zoomOpen && (
        <ImageLightbox images={photos} index={index} alt={productName} onClose={() => setZoomOpen(false)} onIndexChange={setIndex} />
      )}
    </div>
  )
}
