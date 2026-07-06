// ─── Role Types ─────────────────────────────────────────────────────────────

export type UserRole = 'super_admin' | 'restaurant_admin'

// ─── Database Row Types ──────────────────────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  restaurant_id: string | null
  avatar_url: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Restaurant {
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
  is_verified: boolean
  owner_id: string | null
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  restaurant_id: string
  plan: SubscriptionPlan
  status: SubscriptionStatus
  started_at: string
  ends_at: string | null
  created_at: string
  trial_start_date: string | null
  trial_end_date: string | null
  subscription_start_date: string | null
  next_payment_due_date: string | null
  last_payment_date: string | null
  amount_paid: number | null
  notes_admin: string | null
  legacy_price: number | null
  updated_at: string
}

export type SubscriptionPlan = 'starter' | 'pro'
export type SubscriptionStatus = 'active' | 'trial' | 'overdue' | 'suspended' | 'cancelled'

export interface RestaurantWithOwner extends Restaurant {
  owner?: Profile
  subscription?: Subscription
}

export interface ProfileWithRestaurant extends Profile {
  restaurant?: Restaurant
}

export interface AuthUser {
  id: string
  email: string
  role: UserRole
  restaurant_id: string | null
  full_name: string | null
}

export interface CreateRestaurantAdminForm {
  full_name: string
  email: string
  password: string
  restaurant_name: string
  restaurant_slug: string
  restaurant_phone?: string
  restaurant_address?: string
  restaurant_city?: string
  cuisine_type?: string
  plan: SubscriptionPlan
}

export interface LoginForm {
  email: string
  password: string
}

export interface ApiResponse<T = unknown> {
  data: T | null
  error: string | null
  success: boolean
}

export interface SuperAdminStats {
  total_restaurants: number
  active_restaurants: number
  total_admins: number
  total_revenue_estimate: number
}

export interface RestaurantStats {
  total_orders: number
  today_orders: number
  total_revenue: number
  today_revenue: number
}
