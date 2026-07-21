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

export async function POST(request: NextRequest) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json()
    const { category_id, title, pitch, status, subtitle, why_it_matters, key_points, example, common_mistake, action_step } = body

    if (!category_id || !title) {
      return NextResponse.json({ error: 'category_id et title requis' }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin.from('fiches').insert({
      category_id,
      title,
      pitch: pitch ?? '',
      status: status ?? 'brouillon',
      subtitle: subtitle ?? null,
      why_it_matters: why_it_matters ?? null,
      key_points: Array.isArray(key_points) ? key_points : [],
      example: example ?? null,
      common_mistake: common_mistake ?? null,
      action_step: action_step ?? null,
    }).select('id').single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: data.id })
  } catch (err) {
    console.error('super-admin/fiches POST error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
