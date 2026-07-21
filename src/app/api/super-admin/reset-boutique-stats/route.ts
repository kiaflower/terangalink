import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

// Supprime définitivement toutes les commandes et tous les événements
// analytics (vues, ajouts panier, etc.) d'une boutique — remet donc à zéro
// revenus, nombre de commandes et vues affichés dans son dashboard. Les
// lignes de commande sont stockées inline (orders.items, colonne JSON), pas
// dans une table order_items séparée — supprimer orders suffit donc.
// Action irréversible, disponible pour n'importe quelle boutique.
export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { boutique_id } = await request.json()
    if (!boutique_id) return NextResponse.json({ error: 'boutique_id requis' }, { status: 400 })

    const admin = createAdminClient()

    const { data: boutique } = await admin.from('boutiques').select('id').eq('id', boutique_id).single()
    if (!boutique) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

    const { data: orders, error: ordersSelectError } = await admin.from('orders').select('id').eq('boutique_id', boutique_id)
    if (ordersSelectError) return NextResponse.json({ error: ordersSelectError.message }, { status: 500 })
    const orderIds = (orders ?? []).map(o => o.id)

    const { error: ordersError } = await admin.from('orders').delete().eq('boutique_id', boutique_id)
    if (ordersError) return NextResponse.json({ error: ordersError.message }, { status: 500 })

    const { error: eventsError } = await admin.from('analytics_events').delete().eq('boutique_id', boutique_id)
    if (eventsError) return NextResponse.json({ error: eventsError.message }, { status: 500 })

    return NextResponse.json({ ok: true, orders_deleted: orderIds.length })
  } catch (err) {
    console.error('reset-boutique-stats error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
