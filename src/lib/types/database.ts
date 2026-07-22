export type Json = string | number | boolean | null | { [key: string]: Json } | Json[]

export interface RestaurantRow {
  id: string
  name: string
  slug: string
  description: string | null
  logo_url: string | null
  cover_url: string | null
  banner_url: string | null
  phone: string | null
  whatsapp_number: string
  address: string | null
  city: string | null
  cuisine_type: string | null
  is_active: boolean
  is_verified: boolean
  is_demo: boolean
  owner_id: string | null
  latitude: number | null
  longitude: number | null
  primary_color: string
  background_color: string
  button_color: string
  theme: string
  is_founder: boolean
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  snapchat_url: string | null
  wave_number: string | null
  orange_money_number: string | null
  show_delivery_info: boolean
  delivery_info: string | null
  announcement_enabled: boolean
  announcement_image_url: string | null
  announcement_title: string | null
  referral_code: string | null
  referred_by_code: string | null
  opening_hours: OpeningHours | null
  is_boosted: boolean
  newsletter_opt_in: boolean
  last_login_at: string | null
  created_at: string
  updated_at: string
}

export type OpeningHours = Partial<Record<'lundi' | 'mardi' | 'mercredi' | 'jeudi' | 'vendredi' | 'samedi' | 'dimanche', string | null>>

export interface ProfileRow {
  id: string
  email: string
  full_name: string | null
  role: 'super_admin' | 'restaurant_admin'
  restaurant_id: string | null
  admin_role: 'principal' | 'secondaire' | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface SubscriptionRow {
  id: string
  restaurant_id: string
  plan: 'free' | 'starter' | 'pro'
  status: 'active' | 'trial' | 'overdue' | 'suspended' | 'cancelled'
  started_at: string
  ends_at: string | null
  discount_percent: number
  discount_expires_at: string | null
  pending_discount_percent: number | null
  pending_discount_expires_at: string | null
  pending_credit_action: 'discount' | 'free_month' | 'referral_welcome' | null
  notes_admin: string | null
  created_at: string
  updated_at: string
}

export interface PaymentRow {
  id: string
  subscription_id: string
  restaurant_id: string
  amount: number
  method: string
  paid_at: string
  invoice_id: string | null
  created_at: string
}

export interface ReferralRewardRow {
  id: string
  referrer_restaurant_id: string
  referred_restaurant_id: string
  discount_percent: number
  status: 'pending' | 'completed'
  triggered_at: string | null
  created_at: string
}

export interface ReferralCreditRow {
  id: string
  restaurant_id: string
  referred_restaurant_id: string
  status: 'available' | 'consumed'
  consumed_reason: 'discount' | 'free_month' | null
  consumed_at: string | null
  invoice_id: string | null
  created_at: string
}

export interface InvoiceRow {
  id: string
  invoice_number: string
  restaurant_id: string
  subscription_id: string
  period_start: string
  period_end: string
  plan: 'starter' | 'pro'
  full_amount: number
  discount_amount: number
  discount_reason: string | null
  final_amount: number
  status: 'unpaid' | 'paid' | 'overdue'
  payment_method: string | null
  generated_at: string
  due_at: string
  paid_at: string | null
  created_at: string
}

export interface MenuCategoryRow {
  id: string
  restaurant_id: string
  name: string
  position: number
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface ProductRow {
  id: string
  restaurant_id: string
  category_id: string | null
  name: string
  slug: string
  description: string | null
  price: number
  discount_percent: number | null
  image_url: string | null
  images_urls: string[]
  is_available: boolean
  track_stock: boolean
  stock_quantity: number | null
  position: number
  preorder_enabled: boolean
  preorder_start: string | null
  preorder_end: string | null
  preorder_delivery_date: string | null
  preorder_max_qty: number | null
  preorder_current_qty: number
  is_featured: boolean
  badge_text: string | null
  is_pinned: boolean
  video_url: string | null
  created_at: string
  updated_at: string
}

export interface ProductVariantRow {
  id: string
  product_id: string
  name: string
  options: string[]
  option_prices: Record<string, number>
  option_images: Record<string, string>
  created_at: string
}

export interface OrderRow {
  id: string
  restaurant_id: string
  order_number: string
  customer_name: string | null
  customer_phone: string | null
  customer_address: string | null
  items: Json
  total: number
  discount_amount: number
  promo_code_id: string | null
  payment_method: string | null
  status: 'pending' | 'confirmed' | 'in_delivery' | 'delivered' | 'cancelled'
  notes: string | null
  created_at: string
  updated_at: string
}

export interface ReviewRow {
  id: string
  restaurant_id: string
  order_id: string | null
  customer_name: string | null
  rating: number
  comment: string | null
  is_visible: boolean
  created_at: string
}

export interface AnalyticsEventRow {
  id: string
  restaurant_id: string
  event_type: string
  item_id: string | null
  item_name: string | null
  session_id: string | null
  created_at: string
}

export interface WeeklyReportRow {
  id: string
  restaurant_id: string
  period_start: string
  period_end: string
  status: 'sent' | 'failed'
  stats_snapshot: Json | null
  sent_by: string | null
  sent_at: string
  created_at: string
}

export interface BoostRequestRow {
  id: string
  restaurant_id: string
  status: 'pending' | 'active' | 'expired' | 'rejected'
  boost_type: string
  requested_at: string
  activated_at: string | null
  expires_at: string | null
  notes: string | null
}

export interface InscriptionRow {
  id: string
  restaurant_name: string
  owner_name: string
  email: string
  phone: string
  whatsapp_number: string
  cuisine_type: string | null
  city: string | null
  message: string | null
  status: 'pending' | 'approved' | 'rejected'
  created_at: string
}

export interface RestaurantBannerRow {
  id: string
  restaurant_id: string
  text: string
  is_active: boolean
  created_at: string
}

export interface EarlyAccessApplicationRow {
  id: string
  restaurant_name: string
  cuisine_type: string
  city: string
  description: string | null
  owner_name: string
  email: string
  phone: string
  whatsapp_number: string
  instagram_url: string | null
  facebook_url: string | null
  tiktok_url: string | null
  snapchat_url: string | null
  logo_url: string | null
  cover_url: string | null
  wave_number: string | null
  orange_money_number: string | null
  plan: 'starter' | 'pro'
  primary_color: string | null
  theme: string | null
  referral_code: string | null
  partner_offer_type: string | null
  partner_offer_custom: string | null
  consent_images: boolean
  consent_annuaire: boolean
  consent_marketing: boolean
  status: 'pending' | 'contacted' | 'confirmed' | 'rejected'
  place_number: number | null
  notes_admin: string | null
  created_restaurant_id: string | null
  created_admin_password: string | null
  created_at: string
}

export interface EarlyAccessConfigRow {
  id: string
  max_places: number
  is_open: boolean
  launch_date: string | null
  updated_at: string
}

export interface WaitlistRow {
  id: string
  name: string | null
  phone: string
  source: string | null
  created_at: string
}

export interface PromoCodeRow {
  id: string
  restaurant_id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  is_active: boolean
  expires_at: string | null
  created_at: string
}

export interface RestaurantStoryRow {
  id: string
  restaurant_id: string
  media_url: string
  media_type: 'image' | 'video'
  caption: string | null
  product_id: string | null
  views_count: number
  likes_count: number
  created_at: string
  expires_at: string
}

export type NewsletterSegment =
  | { type: 'all' | 'pro' | 'starter' | 'founder' | 'trial' | 'inactive' }
  | {
      type: 'custom'
      plan?: 'starter' | 'pro' | 'any'
      active?: boolean | 'any'
      registeredBefore?: string | null
      registeredAfter?: string | null
    }

export type NewsletterBlock =
  | { id: string; type: 'title'; text: string; align?: 'left' | 'center' | 'right' }
  | { id: string; type: 'paragraph'; text: string }
  | { id: string; type: 'image'; url: string; alt?: string; linkUrl?: string }
  | { id: string; type: 'button'; text: string; url: string }
  | { id: string; type: 'spacer'; height: number }

export interface NewsletterCampaignRow {
  id: string
  name: string
  subject: string
  preview_text: string | null
  from_name: string
  blocks: NewsletterBlock[]
  segment: NewsletterSegment
  status: 'draft' | 'scheduled' | 'sending' | 'sent'
  scheduled_at: string | null
  sent_at: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface NewsletterRecipientRow {
  id: string
  campaign_id: string
  restaurant_id: string
  email: string
  status: 'queued' | 'sent' | 'opened' | 'clicked' | 'failed' | 'unsubscribed'
  error_message: string | null
  sent_at: string | null
  opened_at: string | null
  click_count: number
  first_clicked_at: string | null
  unsubscribed_at: string | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      restaurants: {
        Row: RestaurantRow
        Insert: Partial<RestaurantRow> & { name: string; slug: string; whatsapp_number: string }
        Update: Partial<RestaurantRow>
      }
      profiles: {
        Row: ProfileRow
        Insert: Partial<ProfileRow> & { id: string; email: string }
        Update: Partial<ProfileRow>
      }
      subscriptions: {
        Row: SubscriptionRow
        Insert: Partial<SubscriptionRow> & { restaurant_id: string }
        Update: Partial<SubscriptionRow>
      }
      menu_categories: {
        Row: MenuCategoryRow
        Insert: Partial<MenuCategoryRow> & { restaurant_id: string; name: string }
        Update: Partial<MenuCategoryRow>
      }
      products: {
        Row: ProductRow
        Insert: Partial<ProductRow> & { restaurant_id: string; name: string; price: number }
        Update: Partial<ProductRow>
      }
      product_variants: {
        Row: ProductVariantRow
        Insert: Partial<ProductVariantRow> & { product_id: string; name: string; options: string[] }
        Update: Partial<ProductVariantRow>
      }
      orders: {
        Row: OrderRow
        Insert: Partial<OrderRow> & { restaurant_id: string; order_number: string; items: Json; total: number }
        Update: Partial<OrderRow>
      }
      analytics_events: {
        Row: AnalyticsEventRow
        Insert: Partial<AnalyticsEventRow> & { restaurant_id: string; event_type: string }
        Update: Partial<AnalyticsEventRow>
      }
      weekly_reports: {
        Row: WeeklyReportRow
        Insert: Partial<WeeklyReportRow> & { restaurant_id: string; period_start: string; period_end: string }
        Update: Partial<WeeklyReportRow>
      }
      boost_requests: {
        Row: BoostRequestRow
        Insert: Partial<BoostRequestRow> & { restaurant_id: string }
        Update: Partial<BoostRequestRow>
      }
      inscriptions: {
        Row: InscriptionRow
        Insert: Partial<InscriptionRow> & { restaurant_name: string; owner_name: string; email: string; phone: string; whatsapp_number: string }
        Update: Partial<InscriptionRow>
      }
      promo_codes: {
        Row: PromoCodeRow
        Insert: Partial<PromoCodeRow> & { restaurant_id: string; code: string; discount_type: 'percent' | 'fixed'; discount_value: number }
        Update: Partial<PromoCodeRow>
      }
      reviews: {
        Row: ReviewRow
        Insert: Partial<ReviewRow> & { restaurant_id: string; rating: number }
        Update: Partial<ReviewRow>
      }
      referral_rewards: {
        Row: ReferralRewardRow
        Insert: Partial<ReferralRewardRow> & { referrer_restaurant_id: string; referred_restaurant_id: string }
        Update: Partial<ReferralRewardRow>
      }
      referral_credits: {
        Row: ReferralCreditRow
        Insert: Partial<ReferralCreditRow> & { restaurant_id: string; referred_restaurant_id: string }
        Update: Partial<ReferralCreditRow>
      }
      invoices: {
        Row: InvoiceRow
        Insert: Partial<InvoiceRow> & {
          invoice_number: string; restaurant_id: string; subscription_id: string
          period_start: string; period_end: string; plan: 'starter' | 'pro'
          full_amount: number; final_amount: number; due_at: string
        }
        Update: Partial<InvoiceRow>
      }
      payments: {
        Row: PaymentRow
        Insert: Partial<PaymentRow> & { subscription_id: string; restaurant_id: string; amount: number }
        Update: Partial<PaymentRow>
      }
      restaurant_banners: {
        Row: RestaurantBannerRow
        Insert: Partial<RestaurantBannerRow> & { restaurant_id: string; text: string }
        Update: Partial<RestaurantBannerRow>
      }
      early_access_applications: {
        Row: EarlyAccessApplicationRow
        Insert: Partial<EarlyAccessApplicationRow> & {
          restaurant_name: string; cuisine_type: string; city: string
          owner_name: string; email: string; phone: string; whatsapp_number: string
        }
        Update: Partial<EarlyAccessApplicationRow>
      }
      early_access_config: {
        Row: EarlyAccessConfigRow
        Insert: Partial<EarlyAccessConfigRow>
        Update: Partial<EarlyAccessConfigRow>
      }
      waitlist: {
        Row: WaitlistRow
        Insert: Partial<WaitlistRow> & { phone: string }
        Update: Partial<WaitlistRow>
      }
      restaurant_stories: {
        Row: RestaurantStoryRow
        Insert: Partial<RestaurantStoryRow> & { restaurant_id: string; media_url: string; media_type: 'image' | 'video' }
        Update: Partial<RestaurantStoryRow>
      }
    }
  }
}
