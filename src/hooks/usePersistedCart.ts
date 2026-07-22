'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CartItem } from '@/lib/types'

const CART_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

interface PersistedCart {
  items: CartItem[]
  savedAt: number
}

export function usePersistedCart(restaurantSlug: string) {
  const key = `terangalink_cart_${restaurantSlug}`
  const [cart, setCartState] = useState<CartItem[]>([])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const parsed: PersistedCart = JSON.parse(raw)
      if (Date.now() - parsed.savedAt > CART_TTL_MS) {
        localStorage.removeItem(key)
        return
      }
      setCartState(parsed.items)
    } catch { /* ignore */ }
  }, [key])

  const setCart = useCallback((updater: CartItem[] | ((prev: CartItem[]) => CartItem[])) => {
    setCartState(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try {
        const payload: PersistedCart = { items: next, savedAt: Date.now() }
        localStorage.setItem(key, JSON.stringify(payload))
      } catch { /* storage full */ }
      return next
    })
  }, [key])

  const clearCart = useCallback(() => {
    localStorage.removeItem(key)
    setCartState([])
  }, [key])

  return { cart, setCart, clearCart }
}
