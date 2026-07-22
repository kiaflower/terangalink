import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profileData } = await caller
      .from('profiles')
      .select('role, restaurant_id, admin_role, is_active')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string; restaurant_id: string | null; admin_role: string | null; is_active: boolean } | null

    if (!profile || profile.role !== 'restaurant_admin' || !profile.is_active || !profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (profile.admin_role !== 'principal') {
      return NextResponse.json({ error: 'Seul l\'admin principal peut supprimer un administrateur.' }, { status: 403 })
    }

    const { admin_id } = await request.json()
    if (!admin_id) return NextResponse.json({ error: 'admin_id requis' }, { status: 400 })
    if (admin_id === user.id) {
      return NextResponse.json({ error: 'Vous ne pouvez pas vous supprimer vous-même.' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: targetData } = await admin
      .from('profiles')
      .select('id, restaurant_id, role, admin_role')
      .eq('id', admin_id)
      .single()
    const target = targetData as { id: string; restaurant_id: string | null; role: string; admin_role: string | null } | null

    if (!target || target.restaurant_id !== profile.restaurant_id || target.role !== 'restaurant_admin') {
      return NextResponse.json({ error: 'Administrateur introuvable' }, { status: 404 })
    }
    if (target.admin_role !== 'secondaire') {
      return NextResponse.json({ error: 'Impossible de supprimer l\'admin principal.' }, { status: 403 })
    }

    await admin.from('profiles').update({ is_active: false }).eq('id', admin_id)

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('restaurant admins/remove error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
