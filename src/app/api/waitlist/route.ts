import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { name, phone } = await req.json().catch(() => ({}))
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return NextResponse.json({ error: 'Numéro requis' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { error } = await admin.from('waitlist').insert({
    name: typeof name === 'string' && name.trim() ? name.trim() : null,
    phone: phone.trim(),
    source: 'early_access',
  })

  if (error) {
    if (error.code === '23505') return NextResponse.json({ ok: true }) // already on the waitlist
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
