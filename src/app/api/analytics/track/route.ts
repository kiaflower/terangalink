import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, event_type, item_id, item_name } = body

    if (!event_type) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    // restaurant_id is optional (e.g. directory_view has no restaurant)
    const validRestaurantId = restaurant_id && UUID_RE.test(restaurant_id) ? restaurant_id : null

    // If a restaurant_id was provided but is invalid, skip
    if (restaurant_id && !validRestaurantId) {
      return NextResponse.json({ success: true, skipped: true })
    }

    const supabase = createAdminClient()
    await supabase
      .from('analytics_events')
      .insert({
        restaurant_id: validRestaurantId,
        event_type,
        item_id: item_id || null,
        item_name: item_name || null,
      })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
