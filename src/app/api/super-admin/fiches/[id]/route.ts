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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json()
    const { category_id, title, pitch, status, subtitle, why_it_matters, key_points, example, common_mistake, action_step } = body

    if (!category_id || !title) {
      return NextResponse.json({ error: 'category_id et title requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    // sent_at n'est jamais accepté depuis le client : si le statut passe (ou
    // reste) à "envoyee" via ce formulaire générique et qu'aucun envoi n'a
    // encore été horodaté, on le fixe ici une seule fois — sans jamais
    // écraser l'horodatage d'un envoi déjà fait via "Marquer comme envoyée".
    const finalStatus = status ?? 'brouillon'
    const updates: Record<string, unknown> = {
      category_id,
      title,
      pitch: pitch ?? '',
      status: finalStatus,
      subtitle: subtitle ?? null,
      why_it_matters: why_it_matters ?? null,
      key_points: Array.isArray(key_points) ? key_points : [],
      example: example ?? null,
      common_mistake: common_mistake ?? null,
      action_step: action_step ?? null,
      updated_at: new Date().toISOString(),
    }

    if (finalStatus === 'envoyee') {
      const { data: current } = await admin.from('fiches').select('sent_at').eq('id', params.id).single()
      if (current && !current.sent_at) updates.sent_at = new Date().toISOString()
    }

    const { error } = await admin.from('fiches').update(updates).eq('id', params.id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('super-admin/fiches/[id] POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const { error } = await admin.from('fiches').delete().eq('id', params.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('super-admin/fiches/[id] DELETE error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
