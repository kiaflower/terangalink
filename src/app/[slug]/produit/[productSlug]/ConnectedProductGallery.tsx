'use client'

import { ProductGallery } from '@/components/product/ProductGallery'
import { useVariantSelection } from './VariantSelectionContext'
import type { ProductVariant } from '@/lib/types'

interface ConnectedProductGalleryProps {
  images: string[]
  videoUrl?: string | null
  productName: string
  cardBg: string
  variants?: ProductVariant[]
}

export function ConnectedProductGallery({ images, videoUrl, productName, cardBg, variants }: ConnectedProductGalleryProps) {
  const { selectedVariants } = useVariantSelection()

  let variantImage: string | null = null
  if (variants) {
    for (const v of variants) {
      const chosen = selectedVariants[v.name]
      const img = chosen ? v.option_images?.[chosen] : undefined
      if (img) { variantImage = img; break }
    }
  }

  return <ProductGallery images={images} videoUrl={videoUrl} variantImage={variantImage} productName={productName} cardBg={cardBg} />
}
