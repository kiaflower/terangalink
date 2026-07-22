import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { restaurant_id } = await request.json()
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

    const admin = createAdminClient()

    // Find all admins linked to this restaurant before deleting
    const { data: linkedProfiles } = await admin.from('profiles').select('id').eq('restaurant_id', restaurant_id)
    const adminIds = (linkedProfiles ?? []).map(p => p.id)

    // Unlink profiles first
    await admin.from('profiles').update({ restaurant_id: null }).eq('restaurant_id', restaurant_id)

    // Explicitly clear child rows first — not all FKs cascade, and a
    // leftover reference (e.g. subscriptions) silently blocks the delete.
    const steps: Array<[string, () => PromiseLike<{ error: { message: string } | null }>]> = []

    const { data: productRows } = await admin.from('menu_items').select('id').eq('restaurant_id', restaurant_id)
    const productIds = (productRows ?? []).map(p => p.id)

    if (productIds.length) steps.push(['menu_item_variants', () => admin.from('menu_item_variants').delete().in('menu_item_id', productIds)])
    steps.push(
      ['reviews', () => admin.from('reviews').delete().eq('restaurant_id', restaurant_id)],
      ['menu_items', () => admin.from('menu_items').delete().eq('restaurant_id', restaurant_id)],
      ['menu_categories', () => admin.from('menu_categories').delete().eq('restaurant_id', restaurant_id)],
      ['orders', () => admin.from('orders').delete().eq('restaurant_id', restaurant_id)],
      ['analytics_events', () => admin.from('analytics_events').delete().eq('restaurant_id', restaurant_id)],
      ['promo_codes', () => admin.from('promo_codes').delete().eq('restaurant_id', restaurant_id)],
      ['payments', () => admin.from('payments').delete().eq('restaurant_id', restaurant_id)],
      ['restaurant_banners', () => admin.from('restaurant_banners').delete().eq('restaurant_id', restaurant_id)],
      ['referral_rewards', () => admin.from('referral_rewards').delete().or(`referrer_restaurant_id.eq.${restaurant_id},referred_restaurant_id.eq.${restaurant_id}`)],
      ['subscriptions', () => admin.from('subscriptions').delete().eq('restaurant_id', restaurant_id)],
    )

    for (const [table, run] of steps) {
      const { error } = await run()
      if (error) {
        console.error(`delete-restaurant: failed clearing ${table}:`, error.message)
        return NextResponse.json({ error: `Échec lors du nettoyage de "${table}" : ${error.message}` }, { status: 500 })
      }
    }

    // Delete the restaurant row
    const { error } = await admin.from('restaurants').delete().eq('id', restaurant_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Delete auth users for all linked admins
    for (const uid of adminIds) {
      await admin.auth.admin.deleteUser(uid).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('delete-restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
