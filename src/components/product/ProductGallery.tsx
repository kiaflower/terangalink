'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { ZoomIn, Package } from 'lucide-react'
import { ImageLightbox } from '@/components/ui/ImageLightbox'

interface ProductGalleryProps {
  images: string[]
  // Photo de la variante actuellement sélectionnée (optionnelle) — passe
  // devant les autres photos tant qu'elle est définie.
  variantImage?: string | null
  productName: string
  cardBg: string
  // 'page' = page plat dédiée (grande zone + vignettes en grille).
  // 'modal' = aperçu rapide vitrine (bande défilante compacte, existant).
  variant?: 'page' | 'modal'
}

export function ProductGallery({ images, variantImage, productName, cardBg, variant = 'page' }: ProductGalleryProps) {
  const photos = variantImage ? [variantImage, ...images.filter(url => url !== variantImage)] : images
  const [index, setIndex] = useState(0)
  const [zoomOpen, setZoomOpen] = useState(false)

  // La photo de la variante sélectionnée doit toujours revenir au premier
  // plan, même si le client avait navigué ailleurs dans la galerie.
  useEffect(() => { setIndex(0) }, [variantImage])

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
      <div className="relative aspect-[4/5] sm:aspect-square rounded-2xl overflow-hidden group" style={{ backgroundColor: cardBg }}>
        <Image
          src={photos[index]}
          alt={productName}
          fill
          sizes="(max-width: 768px) 100vw, 60vw"
          priority
          className="object-cover object-top"
        />
        <button type="button" onClick={() => setZoomOpen(true)}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 flex items-center justify-center text-white hover:bg-black/70 transition-colors"
          aria-label="Zoomer sur l'image">
          <ZoomIn className="w-4 h-4" />
        </button>
      </div>
      {photos.length > 1 && (
        <div className="grid grid-cols-5 gap-2 mt-2">
          {photos.map((url, i) => (
            <button key={url + i} type="button" onClick={() => setIndex(i)}
              className="relative aspect-square rounded-lg overflow-hidden transition-opacity"
              style={{ backgroundColor: cardBg, opacity: i === index ? 1 : 0.6 }}
            >
              <Image src={url} alt={`${productName} — image ${i + 1}`} fill sizes="120px" className="object-cover object-top" />
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
