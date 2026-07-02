import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'restaurant_admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const admin = createAdminClient()

    if (profile.role !== 'super_admin') {
      const { data: existing } = await admin
        .from('orders').select('restaurant_id').eq('id', params.id).single()
      if (!existing || existing.restaurant_id !== profile.restaurant_id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      }
    }

    const { data: updated, error } = await admin
      .from('orders')
      .update({ is_paid: true, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id, is_paid')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[order paid] error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
