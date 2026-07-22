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

    const { restaurant_id } = await request.json()
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

    const { data: restaurant } = await supabase.from('restaurants').select('is_active').eq('id', restaurant_id).single()
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const { error } = await supabase
      .from('restaurants')
      .update({ is_active: !restaurant.is_active, updated_at: new Date().toISOString() })
      .eq('id', restaurant_id)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true, is_active: !restaurant.is_active })
  } catch (err) {
    console.error('toggle-restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
