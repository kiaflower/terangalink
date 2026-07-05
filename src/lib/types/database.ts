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
          banner_url: string | null
          phone: string | null
          whatsapp_number: string | null
          address: string | null
          city: string | null
          neighborhood: string | null
          cuisine_type: string | null
          is_active: boolean
          is_verified: boolean
          is_demo: boolean
          owner_id: string | null
          latitude: number | null
          longitude: number | null
          primary_color: string | null
          background_color: string | null
          button_color: string | null
          theme_mode: string | null
          facebook_url: string | null
          instagram_url: string | null
          tiktok_url: string | null
          snapchat_url: string | null
          opening_hours: Json | null
          delivery_fee: number | null
          show_delivery_fee: boolean
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
          banner_url?: string | null
          phone?: string | null
          whatsapp_number?: string | null
          address?: string | null
          city?: string | null
          neighborhood?: string | null
          cuisine_type?: string | null
          is_active?: boolean
          is_verified?: boolean
          is_demo?: boolean
          owner_id?: string | null
          latitude?: number | null
          longitude?: number | null
          primary_color?: string | null
          background_color?: string | null
          button_color?: string | null
          theme_mode?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          snapchat_url?: string | null
          opening_hours?: Json | null
          delivery_fee?: number | null
          show_delivery_fee?: boolean
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
          banner_url?: string | null
          phone?: string | null
          whatsapp_number?: string | null
          address?: string | null
          city?: string | null
          neighborhood?: string | null
          cuisine_type?: string | null
          is_active?: boolean
          is_verified?: boolean
          is_demo?: boolean
          owner_id?: string | null
          latitude?: number | null
          longitude?: number | null
          primary_color?: string | null
          background_color?: string | null
          button_color?: string | null
          theme_mode?: string | null
          facebook_url?: string | null
          instagram_url?: string | null
          tiktok_url?: string | null
          snapchat_url?: string | null
          opening_hours?: Json | null
          delivery_fee?: number | null
          show_delivery_fee?: boolean
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
      menu_categories: {
        Row: {
          id: string
          restaurant_id: string
          name: string
          position: number
          is_active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          name: string
          position?: number
          is_active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          name?: string
          position?: number
          is_active?: boolean
          updated_at?: string
        }
      }
      menu_items: {
        Row: {
          id: string
          restaurant_id: string
          category_id: string | null
          name: string
          description: string | null
          price: number
          image_url: string | null
          is_available: boolean
          position: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          category_id?: string | null
          name: string
          description?: string | null
          price: number
          image_url?: string | null
          is_available?: boolean
          position?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          name?: string
          description?: string | null
          price?: number
          image_url?: string | null
          is_available?: boolean
          position?: number
          updated_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          restaurant_id: string
          customer_name: string | null
          customer_phone: string | null
          items: Json
          total: number
          payment_method: string | null
          status: string
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          customer_name?: string | null
          customer_phone?: string | null
          items: Json
          total: number
          payment_method?: string | null
          status?: string
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          status?: string
          notes?: string | null
          updated_at?: string
        }
      }
      analytics_events: {
        Row: {
          id: string
          restaurant_id: string
          event_type: string
          item_id: string | null
          item_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          restaurant_id: string
          event_type: string
          item_id?: string | null
          item_name?: string | null
          created_at?: string
        }
        Update: {
          event_type?: string
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
