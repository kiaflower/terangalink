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
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { user_id } = await request.json()
    if (!user_id) return NextResponse.json({ error: 'user_id requis' }, { status: 400 })

    const admin = createAdminClient()

    const { data: targetData } = await admin.from('profiles').select('admin_role').eq('id', user_id).single()
    if ((targetData as { admin_role?: string } | null)?.admin_role === 'principal') {
      return NextResponse.json({ error: 'Impossible de supprimer l\'admin principal d\'une boutique. Utilisez la réinitialisation du mot de passe si besoin.' }, { status: 403 })
    }

    // Désactivation en douceur plutôt que suppression immédiate du compte
    // Supabase Auth : si l'admin visé a une session active, ça lui permet de
    // voir le message "Vous avez été déconnecté(e)" (via BoutiqueSessionGuard
    // + le contrôle de session dans le middleware) au lieu de casser sa
    // session en plein vol côté navigateur.
    const { error } = await admin.from('profiles').update({ is_active: false }).eq('id', user_id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('delete-user error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
