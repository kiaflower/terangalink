import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

async function checkSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  return profile?.role === 'super_admin'
}

// PATCH — mettre à jour les notes internes d'une inscription
export async function PATCH(req: NextRequest) {
  if (!await checkSuperAdmin()) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { id, admin_notes } = await req.json()
  if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

  const admin = createAdminClient()
  const { error } = await admin
    .from('restaurant_applications')
    .update({ admin_notes, updated_at: new Date().toISOString() })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
