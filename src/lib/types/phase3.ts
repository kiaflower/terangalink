// ─── Phase 3 Types ────────────────────────────────────────────────────────────
// À ajouter dans src/lib/types/phase3.ts
// Mettre à jour src/lib/types/index.ts pour re-exporter ces types

export type { } from './phase2'

// ─── Restaurant étendu (Phase 3) ─────────────────────────────────────────────

export interface OpeningHours {
  lundi?: { ouverture: string; fermeture: string; ferme?: boolean }
  mardi?: { ouverture: string; fermeture: string; ferme?: boolean }
  mercredi?: { ouverture: string; fermeture: string; ferme?: boolean }
  jeudi?: { ouverture: string; fermeture: string; ferme?: boolean }
  vendredi?: { ouverture: string; fermeture: string; ferme?: boolean }
  samedi?: { ouverture: string; fermeture: string; ferme?: boolean }
  dimanche?: { ouverture: string; fermeture: string; ferme?: boolean }
}

export interface RestaurantPhase3 {
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
  is_verified: boolean
  owner_id: string | null
  latitude: number | null
  longitude: number | null
  delivery_zones: string[]
  opening_hours: OpeningHours
  primary_color: string
  background_color: string
  created_at: string
  updated_at: string
}

export interface RestaurantWithSub extends RestaurantPhase3 {
  subscription?: {
    id: string
    plan: 'mensuel' | 'trimestriel' | 'annuel'
    status: 'active' | 'trial' | 'suspended' | 'cancelled'
  }
  owner?: {
    id: string
    email: string
    full_name: string | null
  }
}

// ─── Formulaire Edit Restaurant ───────────────────────────────────────────────

export interface EditRestaurantForm {
  name: string
  slug: string
  description: string
  city: string
  address: string
  whatsapp_number: string
  latitude: string
  longitude: string
  delivery_zones: string // CSV
  primary_color: string
  background_color: string
  plan: 'mensuel' | 'trimestriel' | 'annuel'
  is_active: boolean
  opening_hours: OpeningHours
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export type AnalyticsEventType = 'page_view' | 'add_to_cart'

export interface AnalyticsEvent {
  id: string
  restaurant_id: string
  event_type: AnalyticsEventType
  item_id: string | null
  item_name: string | null
  created_at: string
}

export interface AnalyticsStats {
  page_views_this_month: number
  page_views_today: number
  page_views_yesterday: number
  top_items: {
    item_id: string
    item_name: string
    count: number
  }[]
}

// ─── RestaurantPageData étendu ────────────────────────────────────────────────

export interface RestaurantPublicData {
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
    primary_color: string
    background_color: string
    opening_hours: OpeningHours
    delivery_zones: string[]
  }
  categories: import('./phase2').MenuCategory[]
  items: import('./phase2').MenuItem[]
}

// ─── Reset Password ───────────────────────────────────────────────────────────

export interface ResetPasswordPayload {
  user_id: string
  new_password: string
}

// ─── Suspend/Activate Restaurant ─────────────────────────────────────────────

export interface ToggleRestaurantPayload {
  restaurant_id: string
  is_active: boolean
}
