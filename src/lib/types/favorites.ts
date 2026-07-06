// ─── Favoris (client uniquement — pas de compte client) ──────────────────────

export interface FavoriteRestaurant {
  type: 'restaurant'
  id: string // restaurant id
  slug: string
  name: string
  logo_url: string | null
  added_at: string
}

export interface FavoriteProduct {
  type: 'product'
  id: string // menu_item id
  restaurant_id: string
  restaurant_slug: string
  restaurant_name: string
  restaurant_logo_url: string | null
  name: string
  price: number
  image_url: string | null
  added_at: string
}

export type FavoriteItem = FavoriteRestaurant | FavoriteProduct
