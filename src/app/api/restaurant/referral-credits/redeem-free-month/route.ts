import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redeemFreeMonth } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profileData } = await caller
      .from('profiles')
      .select('role, restaurant_id, is_active')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string; restaurant_id: string | null; is_active: boolean } | null

    if (!profile || profile.role !== 'restaurant_admin' || !profile.is_active || !profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()
    const result = await redeemFreeMonth(admin, profile.restaurant_id)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('redeem-free-month error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
