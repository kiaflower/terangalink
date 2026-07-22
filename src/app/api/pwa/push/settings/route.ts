import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConnectedRestaurantPwa } from '@/lib/pwa/connectedRestaurant'
import { NOTIFICATION_SETTINGS_DEFAULTS as DEFAULTS, getRestaurantNotificationSettings } from '@/lib/push/notificationSettings'

export const dynamic = 'force-dynamic'

async function requireRestaurant() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), restaurantId: null }
  const restaurant = await getConnectedRestaurantPwa()
  if (!restaurant) return { error: NextResponse.json({ error: 'Aucun restaurant associé' }, { status: 400 }), restaurantId: null }
  return { error: null, restaurantId: restaurant.id }
}

export async function GET() {
  const { error, restaurantId } = await requireRestaurant()
  if (error) return error

  const admin = createAdminClient()
  const settings = await getRestaurantNotificationSettings(admin, restaurantId!)

  return NextResponse.json({
    new_order_enabled: settings.new_order_enabled,
    cart_abandonment_enabled: settings.cart_abandonment_enabled,
    cart_abandonment_delay_hours: settings.cart_abandonment_delay_hours,
    weekly_report_auto_enabled: settings.weekly_report_auto_enabled,
    recommendations_enabled: settings.recommendations_enabled,
    pending_orders_enabled: settings.pending_orders_enabled,
    pending_orders_delay_hours: settings.pending_orders_delay_hours,
    review_received_enabled: settings.review_received_enabled,
  })
}

function clampHours(value: unknown, fallback: number): number {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && n <= 240 ? Math.round(n) : fallback
}

export async function PUT(req: NextRequest) {
  const { error, restaurantId } = await requireRestaurant()
  if (error) return error

  const body = await req.json()

  const update = {
    restaurant_id: restaurantId,
    new_order_enabled: !!body.new_order_enabled,
    cart_abandonment_enabled: !!body.cart_abandonment_enabled,
    cart_abandonment_delay_hours: clampHours(body.cart_abandonment_delay_hours, DEFAULTS.cart_abandonment_delay_hours),
    weekly_report_auto_enabled: !!body.weekly_report_auto_enabled,
    recommendations_enabled: !!body.recommendations_enabled,
    pending_orders_enabled: !!body.pending_orders_enabled,
    pending_orders_delay_hours: clampHours(body.pending_orders_delay_hours, DEFAULTS.pending_orders_delay_hours),
    review_received_enabled: !!body.review_received_enabled,
    updated_at: new Date().toISOString(),
  }

  const admin = createAdminClient()
  const { error: upsertError } = await admin.from('restaurant_notification_settings').upsert(update, { onConflict: 'restaurant_id' })
  if (upsertError) return NextResponse.json({ error: upsertError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
