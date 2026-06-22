import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    // Vérification du rôle via client normal (RLS actif pour auth)
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

    // Utiliser adminClient pour contourner RLS sur les suppressions
    const adminClient = createAdminClient()

    const [
      { error: e1 },
      { error: e2 },
      { error: e3 },
    ] = await Promise.all([
      // Supprimer tous les events analytiques
      adminClient
        .from('analytics_events')
        .delete()
        .eq('restaurant_id', restaurantId),
      // Supprimer toutes les commandes
      adminClient
        .from('orders')
        .delete()
        .eq('restaurant_id', restaurantId),
      // Supprimer les bannières (optionnel, peut être commenté si non souhaité)
      // adminClient.from('banners').delete().eq('restaurant_id', restaurantId),
      // Dummy pour garder le destructuring propre
      Promise.resolve({ error: null }),
    ])

    const errors = [e1, e2, e3].filter(Boolean)
    if (errors.length > 0) {
      console.error('reset-restaurant-analytics errors:', errors)
      return NextResponse.json({ error: errors[0]?.message || 'Erreur suppression' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('reset-restaurant-analytics error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
