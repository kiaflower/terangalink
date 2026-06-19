'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ZoomIn, X, FileImage } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme'

interface FullMenuDisplayProps {
  menuImageUrl: string | null
  enabled: boolean
  tokens: ThemeTokens
}

export function FullMenuDisplay({ menuImageUrl, enabled, tokens }: FullMenuDisplayProps) {
  const [zoomed, setZoomed] = useState(false)

  if (!enabled || !menuImageUrl) return null

  return (
    <>
      {/* Section menu complet */}
      <section className="mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileImage className="w-5 h-5" style={{ color: tokens.accent }} />
          <h2 className="text-lg font-bold" style={{ color: tokens.textPrimary }}>Notre menu complet</h2>
        </div>

        <div
          className="relative w-full rounded-2xl overflow-hidden cursor-zoom-in group"
          style={{ border: `1px solid ${tokens.border}` }}
          onClick={() => setZoomed(true)}
        >
          <div className="relative w-full" style={{ minHeight: 200 }}>
            <Image
              src={menuImageUrl}
              alt="Menu complet"
              width={1200}
              height={900}
              className="w-full h-auto object-contain"
              unoptimized
              priority
            />
          </div>

          {/* Hover overlay */}
          <div
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
            style={{ backgroundColor: 'rgba(0,0,0,0.35)' }}
          >
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-full text-white text-sm font-semibold"
              style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
            >
              <ZoomIn className="w-4 h-4" />
              Agrandir
            </div>
          </div>
        </div>
      </section>

      {/* Lightbox zoom */}
      {zoomed && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90 backdrop-blur-sm cursor-zoom-out"
          onClick={() => setZoomed(false)}
        >
          <button
            onClick={() => setZoomed(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors z-10"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="relative max-w-5xl w-full max-h-[90vh] overflow-auto rounded-2xl"
            onClick={e => e.stopPropagation()}
          >
            <Image
              src={menuImageUrl}
              alt="Menu complet — zoom"
              width={1600}
              height={1200}
              className="w-full h-auto"
              unoptimized
              priority
            />
          </div>
        </div>
      )}
    </>
  )
}
