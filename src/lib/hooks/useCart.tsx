'use client'

import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react'
import type { CartItem, CartState } from '@/lib/types'

// ─── Actions ─────────────────────────────────────────────────────────────────
type CartAction =
  | { type: 'ADD_ITEM'; item: CartItem; restaurantId: string; restaurantSlug: string; restaurantPhone: string; restaurantName: string }
  | { type: 'REMOVE_ITEM'; id: string }
  | { type: 'UPDATE_QTY'; id: string; quantity: number }
  | { type: 'SET_LOCATION'; address: string; mapsUrl: string }
  | { type: 'CLEAR' }

interface CartStateExtended extends CartState {
  customerLocation: string | null
  customerMapsUrl: string | null
}

const initialState: CartStateExtended = {
  items: [],
  restaurantId: null,
  restaurantSlug: null,
  restaurantPhone: null,
  restaurantName: null,
  customerLocation: null,
  customerMapsUrl: null,
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
    case 'SET_LOCATION':
      return { ...state, customerLocation: action.address, customerMapsUrl: action.mapsUrl }
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
  setLocation: (address: string, mapsUrl: string) => void
  clearCart: () => void
  totalItems: number
  totalPrice: number
  whatsappMessage: string
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
  const setLocation = useCallback((address: string, mapsUrl: string) => dispatch({ type: 'SET_LOCATION', address, mapsUrl }), [])
  const clearCart = useCallback(() => dispatch({ type: 'CLEAR' }), [])

  const totalItems = state.items.reduce((s, i) => s + i.quantity, 0)
  const totalPrice = state.items.reduce((s, i) => s + i.price * i.quantity, 0)

  // Build WhatsApp message with optional location
  const itemLines = state.items.map(i =>
    `• ${i.name} x${i.quantity} — ${(i.price * i.quantity).toLocaleString('fr-SN')} FCFA`
  ).join('\n')

  const locationLine = state.customerLocation
    ? `\n\n📍 *Ma localisation :* ${state.customerLocation}${state.customerMapsUrl ? `\n${state.customerMapsUrl}` : ''}`
    : ''

  const whatsappMessage = state.items.length > 0
    ? encodeURIComponent(
        `Bonjour ${state.restaurantName || ''} ! 👋\n\nJe souhaite commander :\n\n${itemLines}\n\n*Total : ${totalPrice.toLocaleString('fr-SN')} FCFA*${locationLine}\n\nMerci !`
      )
    : ''

  return (
    <CartContext.Provider value={{ state, addItem, removeItem, updateQty, setLocation, clearCart, totalItems, totalPrice, whatsappMessage }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
