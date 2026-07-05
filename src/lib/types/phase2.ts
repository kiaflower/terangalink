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
  image_urls?: string[]
  is_available: boolean
  is_featured: boolean
  featured_label?: 'Best Seller' | 'Nouveau' | 'Promotion' | 'Recommandé' | null
  is_pinned?: boolean
  position: number
  created_at: string
  updated_at: string
  // Stock (Premium)
  stock_enabled?: boolean
  stock_quantity?: number | null
  stock_low_threshold?: number
  // Précommandes (Premium)
  preorder_enabled?: boolean
  preorder_open_at?: string | null
  preorder_close_at?: string | null
  preorder_delivery_date?: string | null
  preorder_max_qty?: number | null
  preorder_reserved?: number
  // joined
  category?: MenuCategory
  variants?: MenuItemVariant[]
}

export type OrderStatus = 'pending' | 'confirmed' | 'delivered' | 'cancelled' | 'delivery_cancelled'
export type PaymentMethod = 'cash' | 'wave' | 'orange_money'

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  image_url?: string | null
  variant_id?: string | null
  variant_name?: string | null
}

export interface Order {
  id: string
  order_number?: string
  restaurant_id: string
  customer_name: string | null
  customer_phone: string | null
  items: OrderItem[]
  total: number
  payment_method: PaymentMethod | null
  status: OrderStatus
  is_paid: boolean
  notes: string | null
  promo_code_id: string | null
  discount_amount: number
  created_at: string
  updated_at: string
}


// ─── Premium Types ────────────────────────────────────────────────────────────

export interface MenuItemVariant {
  id: string
  menu_item_id: string
  restaurant_id: string
  name: string
  price: number
  position: number
  created_at: string
}

export interface PromoCode {
  id: string
  restaurant_id: string
  code: string
  discount_type: 'fixed' | 'percent'
  discount_value: number
  min_order_amount: number | null
  starts_at: string | null
  expires_at: string | null
  max_uses: number | null
  used_count: number
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── Cart Types ───────────────────────────────────────────────────────────────

export interface CartItem {
  // cart_key : clé interne du panier (jamais envoyée à la BDD)
  // Format : "<menu_item_uuid>" ou "<menu_item_uuid>__<variant_uuid>"
  cart_key: string

  // id : vrai UUID du menu_item (envoyé dans orders.items.id)
  id: string

  name: string
  price: number
  quantity: number
  image_url?: string | null

  // Envoyés séparément dans orders.items
  variant_id?: string | null
  variant_name?: string | null

  preorder_delivery_date?: string | null
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
    banner_url: string | null
    phone: string | null
    whatsapp_number: string | null
    address: string | null
    city: string | null
    cuisine_type: string | null
    is_active: boolean
    is_demo?: boolean
    plan?: string
    // Thème
    primary_color?: string | null
    background_color?: string | null
    button_color?: string | null
    theme_mode?: string | null
    // Réseaux sociaux (Pro)
    facebook_url?: string | null
    instagram_url?: string | null
    tiktok_url?: string | null
    // Horaires & livraison
    opening_hours?: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> | null
    delivery_fee?: number | null
    show_delivery_fee?: boolean
    // Géolocalisation
    latitude?: number | null
    longitude?: number | null
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
  pending:            'En attente',
  confirmed:          'Confirmée',
  delivered:          'Livrée',
  cancelled:          'Annulée',
  delivery_cancelled: 'Livraison annulée',
}

export const ORDER_STATUS_COLORS: Record<OrderStatus, string> = {
  pending:            'warning',
  confirmed:          'info',
  delivered:          'success',
  cancelled:          'danger',
  delivery_cancelled: 'danger',
}
