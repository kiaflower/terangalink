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

    const { boutique_id } = await request.json()
    if (!boutique_id) return NextResponse.json({ error: 'boutique_id requis' }, { status: 400 })

    const admin = createAdminClient()

    // Find all admins linked to this boutique before deleting
    const { data: linkedProfiles } = await admin.from('profiles').select('id').eq('boutique_id', boutique_id)
    const adminIds = (linkedProfiles ?? []).map(p => p.id)

    // Unlink profiles first
    await admin.from('profiles').update({ boutique_id: null }).eq('boutique_id', boutique_id)

    // Explicitly clear child rows first — not all FKs cascade, and a
    // leftover reference (e.g. subscriptions) silently blocks the delete.
    const steps: Array<[string, () => PromiseLike<{ error: { message: string } | null }>]> = []

    const { data: productRows } = await admin.from('products').select('id').eq('boutique_id', boutique_id)
    const productIds = (productRows ?? []).map(p => p.id)

    if (productIds.length) steps.push(['product_variants', () => admin.from('product_variants').delete().in('product_id', productIds)])
    steps.push(
      ['reviews', () => admin.from('reviews').delete().eq('boutique_id', boutique_id)],
      ['products', () => admin.from('products').delete().eq('boutique_id', boutique_id)],
      ['product_categories', () => admin.from('product_categories').delete().eq('boutique_id', boutique_id)],
      ['orders', () => admin.from('orders').delete().eq('boutique_id', boutique_id)],
      ['analytics_events', () => admin.from('analytics_events').delete().eq('boutique_id', boutique_id)],
      ['boost_requests', () => admin.from('boost_requests').delete().eq('boutique_id', boutique_id)],
      ['promo_codes', () => admin.from('promo_codes').delete().eq('boutique_id', boutique_id)],
      ['payments', () => admin.from('payments').delete().eq('boutique_id', boutique_id)],
      ['boutique_banners', () => admin.from('boutique_banners').delete().eq('boutique_id', boutique_id)],
      ['referral_rewards', () => admin.from('referral_rewards').delete().or(`referrer_boutique_id.eq.${boutique_id},referred_boutique_id.eq.${boutique_id}`)],
      ['subscriptions', () => admin.from('subscriptions').delete().eq('boutique_id', boutique_id)],
    )

    for (const [table, run] of steps) {
      const { error } = await run()
      if (error) {
        console.error(`delete-boutique: failed clearing ${table}:`, error.message)
        return NextResponse.json({ error: `Échec lors du nettoyage de "${table}" : ${error.message}` }, { status: 500 })
      }
    }

    // Delete the boutique row
    const { error } = await admin.from('boutiques').delete().eq('id', boutique_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Delete auth users for all linked admins
    for (const uid of adminIds) {
      await admin.auth.admin.deleteUser(uid).catch(() => {})
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('delete-boutique error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
