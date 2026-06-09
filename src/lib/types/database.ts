export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          email: string
          full_name: string | null
          role: 'super_admin' | 'restaurant_admin'
          restaurant_id: string | null
          avatar_url: string | null
          phone: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          email: string
          full_name?: string | null
          role?: 'super_admin' | 'restaurant_admin'
          restaurant_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          email?: string
          full_name?: string | null
          role?: 'super_admin' | 'restaurant_admin'
          restaurant_id?: string | null
          avatar_url?: string | null
          phone?: string | null
          updated_at?: string
        }
      }
      restaurants: {
        Row: {
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
          banner_url: string | null
          whatsapp_number: string | null
          primary_color: string | null
          background_color: string | null
          button_color: string | null
          theme_mode: 'dark' | 'light' | null
          opening_hours: Json | null
          delivery_zones: Json | null
          delivery_fee: number | null
          show_delivery_fee: boolean | null
          latitude: number | null
          longitude: number | null
          is_demo: boolean | null
          facebook_url: string | null
          instagram_url: string | null
          tiktok_url: string | null
          website_url: string | null
          wave_number: string | null
          orange_money_number: string | null
          prep_time_minutes: number | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
          description?: string | null
          logo_url?: string | null
          cover_url?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          cuisine_type?: string | null
          is_active?: boolean
          is_verified?: boolean
          owner_id?: string | null
          banner_url?: string | null
          whatsapp_number?: string | null
          primary_color?: string | null
          background_color?: string | null
          button_color?: string | null
          theme_mode?: 'dark' | 'light' | null
          opening_hours?: Json | null
          delivery_zones?: Json | null
          delivery_fee?: number | null
          show_delivery_fee?: boolean | null
          latitude?: number | null
          longitude?: number | null
          is_demo?: boolean | null
          facebook_url?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          website_url?: string | null
          wave_number?: string | null
          orange_money_number?: string | null
          prep_time_minutes?: number | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          slug?: string
          description?: string | null
          logo_url?: string | null
          cover_url?: string | null
          phone?: string | null
          address?: string | null
          city?: string | null
          cuisine_type?: string | null
          is_active?: boolean
          is_verified?: boolean
          owner_id?: string | null
          banner_url?: string | null
          whatsapp_number?: string | null
          primary_color?: string | null
          background_color?: string | null
          button_color?: string | null
          theme_mode?: 'dark' | 'light' | null
          opening_hours?: Json | null
          delivery_zones?: Json | null
          delivery_fee?: number | null
          show_delivery_fee?: boolean | null
          latitude?: number | null
          longitude?: number | null
          is_demo?: boolean | null
          facebook_url?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          website_url?: string | null
          wave_number?: string | null
          orange_money_number?: string | null
          prep_time_minutes?: number | null
          updated_at?: string
        }
      }
      subscriptions: {
        Row: {
          id: string
          restaurant_id: string
          plan: 'starter' | 'pro'
          status: 'active' | 'trial' | 'suspended' | 'cancelled'
          started_at: string
          ends_at: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          plan?: 'starter' | 'pro'
          status?: 'active' | 'trial' | 'suspended' | 'cancelled'
          started_at?: string
          ends_at?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          plan?: 'starter' | 'pro'
          status?: 'active' | 'trial' | 'suspended' | 'cancelled'
          ends_at?: string | null
          updated_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      user_role: 'super_admin' | 'restaurant_admin'
      subscription_plan: 'starter' | 'pro'
      subscription_status: 'active' | 'trial' | 'suspended' | 'cancelled'
    }
  }
}
