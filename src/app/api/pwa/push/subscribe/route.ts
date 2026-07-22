import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getConnectedRestaurantPwa } from '@/lib/pwa/connectedRestaurant'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const subscription = body?.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } } | undefined
  const context = body?.context === 'admin' ? 'admin' : 'restaurant'

  if (!subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: 'Abonnement invalide' }, { status: 400 })
  }

  const admin = createAdminClient()

  let restaurantId: string | null = null
  if (context === 'admin') {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
  } else {
    const restaurant = await getConnectedRestaurantPwa()
    if (!restaurant) return NextResponse.json({ error: 'Aucun restaurant associée' }, { status: 400 })
    restaurantId = restaurant.id
  }

  const { error } = await admin.from('push_subscriptions').upsert({
    profile_id: user.id,
    restaurant_id: restaurantId,
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: req.headers.get('user-agent'),
    last_seen_at: new Date().toISOString(),
  }, { onConflict: 'endpoint' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
