import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const restaurantId = body?.restaurant_id

    if (!restaurantId || typeof restaurantId !== 'string') {
      return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })
    }

    const { error } = await supabase
      .from('analytics_events')
      .delete()
      .eq('restaurant_id', restaurantId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('reset-restaurant-analytics error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}