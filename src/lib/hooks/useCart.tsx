'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { CartItem, CartState } from '@/lib/types'

// ─── Actions ─────────────────────────────────────────────────────────────────
type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem; restaurantId: string; restaurantSlug: string; restaurantPhone: string; restaurantName: string }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_QTY'; id: string; quantity: number }
  | { type: 'CLEAR' }

type CartStateExtended = CartState

const initialState: CartStateExtended = {
  items: [],
  restaurantId: null,
  restaurantSlug: null,
  restaurantPhone: null,
  restaurantName: null,
}

function cartReducer(state: CartStateExtended, action: CartAction): CartStateExtended {
  switch (action.type) {
    case 'ADD_ITEM': {
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
      const existing = state.items.find(i => i.id === action.item.id)
      if (existing) {
        return {
          ...state,
          restaurantId: action.restaurantId,
          restaurantSlug: action.restaurantSlug,
          restaurantPhone: action.restaurantPhone,
          restaurantName: action.restaurantName,
          items: state.items.map(i =>
            i.id === action.item.id ? { ...i, quantity: i.quantity + 1 } : i
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
      return { ...state, items: state.items.filter(i => i.id !== action.id) }
    case 'UPDATE_QTY':
      if (action.quantity <= 0) {
        return { ...state, items: state.items.filter(i => i.id !== action.id) }
      }
      return {
        ...state,
        items: state.items.map(i =>
          i.id === action.id ? { ...i, quantity: action.quantity } : i
        ),
      }
    case 'CLEAR':
      return initialState
    default:
      return state
  }
}

// ─── Context ─────────────────────────────────────────────────────────────────
interface CartContextType {
  state: CartStateExtended
  addItem: (item: CartItem, restaurantId: string, restaurantSlug: string, restaurantPhone: string, restaurantName: string) => void
  removeItem: (id: string) => void
  updateQty: (id: string, quantity: number) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
}

const CartContext = createContext<CartContextType | null>(null)

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, initialState)

  const addItem = useCallback(
    (item: CartItem, restaurantId: string, restaurantSlug: string, restaurantPhone: string, restaurantName: string) => {
      dispatch({ type: 'ADD_ITEM', item, restaurantId, restaurantSlug, restaurantPhone, restaurantName })
    }, []
  )
  const removeItem = useCallback((id: string) => dispatch({ type: 'REMOVE_ITEM', id }), [])
  const updateQty = useCallback((id: string, quantity: number) => dispatch({ type: 'UPDATE_QTY', id, quantity }), [])
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, updateQty, clearCart, totalItems, totalPrice }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}