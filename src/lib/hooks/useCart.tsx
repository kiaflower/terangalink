'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { CartItem, CartState } from '@/lib/types'

// ─── Actions ──────────────────────────────────────────────────────────────────
// Toutes les actions utilisent cart_key comme identifiant interne du panier,
// jamais id (qui est le vrai UUID menu_item destiné à la BDD)

type CartAction =
  | {
      type: 'ADD_ITEM'
      item: CartItem
      restaurantId: string
      restaurantSlug: string
      restaurantPhone: string
      restaurantName: string
    }
  | { type: 'REMOVE_ITEM'; cart_key: string }
  | { type: 'UPDATE_QTY'; cart_key: string; quantity: number }
  | { type: 'CLEAR' }

const initialState: CartState = {
  items: [],
  restaurantId: null,
  restaurantSlug: null,
  restaurantPhone: null,
  restaurantName: null,
}

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {
    case 'ADD_ITEM': {
      // Si le panier appartient à un autre restaurant → vider et recommencer
      if (state.restaurantId && state.restaurantId !== action.restaurantId) {
        return {
          ...initialState,
          items: [{ ...action.item, quantity: 1 }],
          restaurantId: action.restaurantId,
          restaurantSlug: action.restaurantSlug,
          restaurantPhone: action.restaurantPhone,
          restaurantName: action.restaurantName,
        }
      }

      // Chercher par cart_key (pas par id) pour distinguer variantes du même plat
      const existing = state.items.find(i => i.cart_key === action.item.cart_key)
      if (existing) {
        return {
          ...state,
          restaurantId: action.restaurantId,
          restaurantSlug: action.restaurantSlug,
          restaurantPhone: action.restaurantPhone,
          restaurantName: action.restaurantName,
          items: state.items.map(i =>
            i.cart_key === action.item.cart_key
              ? { ...i, quantity: i.quantity + 1 }
              : i
          ),
        }
      }

      return {
        ...state,
        restaurantId: action.restaurantId,
        restaurantSlug: action.restaurantSlug,
        restaurantPhone: action.restaurantPhone,
        restaurantName: action.restaurantName,
        items: [...state.items, { ...action.item, quantity: 1 }],
      }
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(i => i.cart_key !== action.cart_key),
      }

    case 'UPDATE_QTY':
      if (action.quantity <= 0) {
        return {
          ...state,
          items: state.items.filter(i => i.cart_key !== action.cart_key),
        }
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.cart_key === action.cart_key ? { ...i, quantity: action.quantity } : i
        ),
      }

    case 'CLEAR':
      return initialState

    default:
      return state
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface CartContextType {
  state: CartState
  addItem: (
    item: CartItem,
    restaurantId: string,
    restaurantSlug: string,
    restaurantPhone: string,
    restaurantName: string
  ) => void
  removeItem: (cart_key: string) => void
  updateQty: (cart_key: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  const addItem = useCallback(
    (
      item: CartItem,
      restaurantId: string,
      restaurantSlug: string,
      restaurantPhone: string,
      restaurantName: string
    ) => {
      dispatch({ type: 'ADD_ITEM', item, restaurantId, restaurantSlug, restaurantPhone, restaurantName })
    },
    []
  )

  const removeItem = useCallback(
    (cart_key: string) => dispatch({ type: 'REMOVE_ITEM', cart_key }),
    []
  )

  const updateQty = useCallback(
    (cart_key: string, quantity: number) => dispatch({ type: 'UPDATE_QTY', cart_key, quantity }),
    []
  )

  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{ state, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
