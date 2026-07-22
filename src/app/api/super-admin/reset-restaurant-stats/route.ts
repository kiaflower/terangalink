import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Supprime définitivement toutes les commandes et tous les événements
// analytics (vues, ajouts panier, etc.) d'un restaurant — remet donc à zéro
// revenus, nombre de commandes et vues affichés dans son dashboard. Les
// lignes de commande sont stockées inline (orders.items, colonne JSON), pas
// dans une table order_items séparée — supprimer orders suffit donc.
// Action irréversible, disponible pour n'importe quel restaurant.
export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { restaurant_id } = await request.json()
    if (!restaurant_id) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

    const admin = createAdminClient()

    const { data: restaurant } = await admin.from('restaurants').select('id').eq('id', restaurant_id).single()
    if (!restaurant) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const { data: orders, error: ordersSelectError } = await admin.from('orders').select('id').eq('restaurant_id', restaurant_id)
    if (ordersSelectError) return NextResponse.json({ error: ordersSelectError.message }, { status: 500 })
    const orderIds = (orders ?? []).map(o => o.id)

    const { error: ordersError } = await admin.from('orders').delete().eq('restaurant_id', restaurant_id)
    if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })

    const { error: eventsError } = await admin.from('analytics_events').delete().eq('restaurant_id', restaurant_id)
    if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 })

    return NextResponse.json({ ok: true, orders_deleted: orderIds.length })
  } catch (err) {
    console.error('reset-restaurant-stats error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
