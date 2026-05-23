// ─── Re-export Phase 1 types ─────────────────────────────────────────────────
export type { UserRole, Profile, Restaurant, Subscription, SubscriptionPlan, SubscriptionStatus, RestaurantWithOwner, ProfileWithRestaurant, AuthUser, CreateRestaurantAdminForm, LoginForm, ApiResponse, SuperAdminStats, RestaurantStats } from './phase1'

// ─── Phase 2 Types ────────────────────────────────────────────────────────────

export interface MenuCategory {
  id: string
  restaurant_id: string
  name: string
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface MenuItem {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  description: string | null
  price: number // FCFA
  image_url: string | null
  is_available: boolean
  position: number
  created_at: string
  updated_at: string
  // joined
  category?: MenuCategory
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
}

export interface Order {
  id: string
  restaurant_id: string
  customer_name: string | null
  customer_phone: string | null
  items: OrderItem[]
  total: number
  status: OrderStatus
  notes: string | null
  created_at: string
  updated_at: string
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
}

export interface CartState {
  items: CartItem[]
  restaurantId: string | null
  restaurantSlug: string | null
  restaurantPhone: string | null
  restaurantName: string | null
}

// ─── Restaurant Public Page Types ─────────────────────────────────────────────

export interface RestaurantPageData {
  restaurant: {
    id: string
    name: string
    slug: string
    description: string | null
    logo_url: string | null
    cover_url: string | null
    phone: string | null
    address: string | null
    city: string | null
    cuisine_type: string | null
    is_active: boolean
  }
  categories: MenuCategory[]
  items: MenuItem[]
}

// ─── Form Types ───────────────────────────────────────────────────────────────

export interface MenuItemForm {
  name: string
  description: string
  price: string
  category_id: string
  is_available: boolean
  image_url?: string
}

export interface MenuCategoryForm {
  name: string
  position: number
  is_active: boolean
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente',
  preparing: 'En préparation',
  ready: 'Prêt',
  delivered: 'Livré',
  cancelled: 'Annulé',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending: 'warning',
  preparing: 'info',
  ready: 'success',
  delivered: 'default',
  cancelled: 'danger',
}
