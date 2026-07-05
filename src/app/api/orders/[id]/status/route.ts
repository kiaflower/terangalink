import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

const VALID_STATUSES = [
  'pending', 'confirmed',
  'delivered', 'cancelled', 'delivery_cancelled'
]

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile || (profile.role !== 'restaurant_admin' && profile.role !== 'super_admin')) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    const body = await request.json()
    const { status } = body
    if (!status || !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
    }

    const orderId = params.id
    const admin = createAdminClient()

    // Vérifier que la commande appartient bien à ce restaurant AVANT de modifier
    if (profile.role !== 'super_admin') {
      const { data: existing } = await admin
        .from('orders')
        .select('restaurant_id')
        .eq('id', orderId)
        .single()

      if (!existing || existing.restaurant_id !== profile.restaurant_id) {
        return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
      }
    }

    // Mise à jour avec adminClient — bypass RLS et types TS
    const { data: updated, error: updateError } = await admin
      .from('orders')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', orderId)
      .select('id, status, order_number, restaurant_id')
      .single()

    if (updateError) {
      console.error('[order status] update error:', updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data: updated })
  } catch (err) {
    console.error('[order status] unexpected error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
