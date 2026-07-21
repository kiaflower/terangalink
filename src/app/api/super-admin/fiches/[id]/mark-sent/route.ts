import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

/** Bascule une fiche "prete" en "envoyee" et horodate l'envoi — action manuelle et explicite. */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('fiches')
      .update({ status: 'envoyee', sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .eq('status', 'prete')
      .select('id')
      .maybeSingle()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!data) return NextResponse.json({ error: 'Cette fiche n\'est pas au statut « Prête »' }, { status: 400 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('super-admin/fiches/[id]/mark-sent error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
