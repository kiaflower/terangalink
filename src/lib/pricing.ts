import type { ProductWithVariants } from '@/lib/types'
import { applyDiscount } from '@/lib/utils'

export function getUnitPrice(product: ProductWithVariants, selectedVariants: Record<string, string>): number {
  let price = product.price
  if (product.variants) {
    for (const v of product.variants) {
      const chosen = selectedVariants[v.name]
      const override = chosen ? v.option_prices?.[chosen] : undefined
      if (override != null) { price = override; break }
    }
  }
  return applyDiscount(price, product.discount_percent)
}

export function getPriceInfo(product: ProductWithVariants) {
  const candidates = [product.price]
  if (product.variants) {
    for (const v of product.variants) {
      for (const opt of v.options) {
        const override = v.option_prices?.[opt]
        if (override != null) candidates.push(override)
      }
    }
  }
  const discounted = candidates.map(p => applyDiscount(p, product.discount_percent))
  const min = Math.min(...discounted)
  const max = Math.max(...discounted)
  return {
    min, max,
    hasRange: min !== max,
    hasDiscount: !!product.discount_percent,
    basePrice: applyDiscount(product.price, product.discount_percent),
  }
}
