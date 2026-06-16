import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify caller is super_admin
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { user_id, new_password } = await request.json()
    if (!user_id || !new_password || new_password.length < 8) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.auth.admin.updateUserById(user_id, { password: new_password })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Sauvegarder le mot de passe pour affichage dans le super-admin
    await admin.from('profiles').update({
      temp_password: new_password,
      updated_at: new Date().toISOString(),
    }).eq('id', user_id)

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
