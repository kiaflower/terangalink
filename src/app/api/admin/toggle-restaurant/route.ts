// src/app/api/admin/toggle-restaurant/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { restaurant_id, is_active } = await request.json()

    if (!restaurant_id || is_active === undefined) {
      return NextResponse.json(
        { error: 'restaurant_id et is_active sont requis' },
        { status: 400 }
      )
    }

    // Mettre à jour restaurants
    const { error: rError } = await supabase
      .from('restaurants')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', restaurant_id)

    if (rError) throw rError

    // Mettre à jour subscriptions
    const newStatus = is_active ? 'active' : 'suspended'
    const { error: sError } = await supabase
      .from('subscriptions')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('restaurant_id', restaurant_id)

    if (sError) throw sError

    return NextResponse.json({ success: true, is_active })
  } catch (err) {
    console.error('toggle-restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
