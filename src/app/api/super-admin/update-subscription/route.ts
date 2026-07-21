import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const VALID_PLANS = ['free', 'starter', 'pro']
const VALID_STATUSES = ['trial', 'active', 'overdue', 'suspended', 'cancelled']

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { id, boutique_id, plan, status, ends_at, notes_admin } = await request.json()
    if (!id && !boutique_id) return NextResponse.json({ error: 'id ou boutique_id requis' }, { status: 400 })
    if (plan && !VALID_PLANS.includes(plan)) return NextResponse.json({ error: 'Plan invalide' }, { status: 400 })
    if (status && !VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })

    if (id) {
      const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
      if (plan) payload.plan = plan
      if (status) payload.status = status
      if (ends_at) payload.ends_at = ends_at
      if (notes_admin !== undefined) payload.notes_admin = notes_admin

      const { error } = await supabase.from('subscriptions').update(payload).eq('id', id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      // No subscription row exists yet for this boutique (e.g. the demo
      // boutique, or one created outside the normal signup flow) — create it.
      const { error } = await supabase.from('subscriptions').upsert({
        boutique_id,
        plan: plan || 'starter',
        status: status || 'active',
        started_at: new Date().toISOString(),
        ends_at: ends_at || null,
        notes_admin: notes_admin ?? null,
      }, { onConflict: 'boutique_id' })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('update-subscription error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
