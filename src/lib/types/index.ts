import type { Database } from './database'

export type { OpeningHours } from './database'
export type Restaurant = Database['public']['Tables']['restaurants']['Row']
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Subscription = Database['public']['Tables']['subscriptions']['Row']
export type MenuCategory = Database['public']['Tables']['menu_categories']['Row']
export type Product = Database['public']['Tables']['menu_items']['Row']
export type ProductVariant = Database['public']['Tables']['menu_item_variants']['Row']
export type Order = Database['public']['Tables']['orders']['Row']
export type AnalyticsEvent = Database['public']['Tables']['analytics_events']['Row']
export type Inscription = Database['public']['Tables']['inscriptions']['Row']
export type PromoCode = Database['public']['Tables']['promo_codes']['Row']
export type RestaurantStory = Database['public']['Tables']['restaurant_stories']['Row']

export type ProductWithVariants = Product & { variants?: ProductVariant[] }
export type CategoryWithProducts = MenuCategory & { products?: ProductWithVariants[] }

export interface CartItem {
  product: Product
  quantity: number
  selectedVariants?: Record<string, string>
  unitPrice: number
}
