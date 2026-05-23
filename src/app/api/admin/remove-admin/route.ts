import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: callerProfile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { profile_id, action } = await request.json()
    // action: 'unlink' (just removes restaurant_id) | 'delete' (deletes auth user)

    if (!profile_id) {
      return NextResponse.json({ error: 'profile_id requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (action === 'delete') {
      // Delete auth user (cascade deletes profile via FK)
      await admin.auth.admin.deleteUser(profile_id)
    } else {
      // Just unlink from restaurant
      await admin.from('profiles')
        .update({ restaurant_id: null })
        .eq('id', profile_id)
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Remove admin error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
