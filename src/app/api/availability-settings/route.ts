import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const admin = createAdminClient()
    const { data } = await admin.from('availability_settings').select('*').limit(1).maybeSingle()
    return NextResponse.json(data ?? {})
  } catch {
    return NextResponse.json({})
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const body = await req.json().catch(() => null)
    if (!body) return NextResponse.json({ error: 'Invalid body' }, { status: 400 })

    const { active_days, start_time, end_time, slot_duration, blocked_dates } = body

    const admin = createAdminClient()
    const { data: existing } = await admin.from('availability_settings').select('id').limit(1).maybeSingle()

    if (existing) {
      const { error } = await admin.from('availability_settings')
        .update({ active_days, start_time, end_time, slot_duration, blocked_dates, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    } else {
      const { error } = await admin.from('availability_settings')
        .insert({ active_days, start_time, end_time, slot_duration, blocked_dates })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('availability-settings error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
