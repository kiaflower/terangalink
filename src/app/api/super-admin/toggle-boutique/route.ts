import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { boutique_id } = await request.json()
    if (!boutique_id) return NextResponse.json({ error: 'boutique_id requis' }, { status: 400 })

    const { data: boutique } = await supabase.from('boutiques').select('is_active').eq('id', boutique_id).single()
    if (!boutique) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

    const { error } = await supabase
      .from('boutiques')
      .update({ is_active: !boutique.is_active, updated_at: new Date().toISOString() })
      .eq('id', boutique_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, is_active: !boutique.is_active })
  } catch (err) {
    console.error('toggle-boutique error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
