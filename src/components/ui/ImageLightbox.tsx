'use client'

import { X, ChevronLeft, ChevronRight } from 'lucide-react'

interface ImageLightboxProps {
  images: string[]
  index: number
  alt: string
  onClose: () => void
  onIndexChange?: (index: number) => void
  footer?: React.ReactNode
}

export function ImageLightbox({ images, index, alt, onClose, onIndexChange, footer }: ImageLightboxProps) {
  if (images.length === 0) return null
  return (
    <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4" onClick={onClose}>
      <button onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
        aria-label="Fermer">
        <X className="w-6 h-6" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt={alt}
        className="max-w-full max-h-full object-contain" onClick={e => e.stopPropagation()} />
      {images.length > 1 && onIndexChange && (
        <>
          <button onClick={e => { e.stopPropagation(); onIndexChange((index - 1 + images.length) % images.length) }}
            className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Image précédente">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button onClick={e => { e.stopPropagation(); onIndexChange((index + 1) % images.length) }}
            className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            aria-label="Image suivante">
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      {footer && (
        <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6" onClick={e => e.stopPropagation()}>
          {footer}
        </div>
      )}
    </div>
  )
}
