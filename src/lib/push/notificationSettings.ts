import type { SupabaseClient } from '@supabase/supabase-js'

export const NOTIFICATION_SETTINGS_DEFAULTS = {
  new_order_enabled: true,
  cart_abandonment_enabled: true,
  cart_abandonment_delay_hours: 48,
  weekly_report_auto_enabled: true,
  recommendations_enabled: true,
  pending_orders_enabled: true,
  pending_orders_delay_hours: 48,
  review_received_enabled: true,
}

export interface RestaurantNotificationSettings {
  new_order_enabled: boolean
  cart_abandonment_enabled: boolean
  cart_abandonment_delay_hours: number
  cart_abandonment_last_checked_at: string | null
  weekly_report_auto_enabled: boolean
  recommendations_enabled: boolean
  recommendations_last_sent_at: string | null
  pending_orders_enabled: boolean
  pending_orders_delay_hours: number
  pending_orders_last_sent_at: string | null
  review_received_enabled: boolean
}

// Un restaurant sans ligne en base utilise les valeurs par défaut — la ligne
// n'est créée qu'au premier changement de réglage ou au premier passage du
// cron qui doit persister un timestamp (last_checked_at / last_sent_at).
export async function getRestaurantNotificationSettings(
  admin: SupabaseClient,
  restaurantId: string
): Promise<RestaurantNotificationSettings> {
  const { data } = await admin
    .from('restaurant_notification_settings')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .maybeSingle()

  return {
    ...NOTIFICATION_SETTINGS_DEFAULTS,
    cart_abandonment_last_checked_at: null,
    recommendations_last_sent_at: null,
    pending_orders_last_sent_at: null,
    ...(data ?? {}),
  }
}
