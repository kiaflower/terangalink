// src/app/api/analytics/stats/route.ts
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
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

    if (!profile?.restaurant_id) {
      return NextResponse.json({ error: 'Aucun restaurant lié' }, { status: 400 })
    }

    const restaurantId = profile.restaurant_id

    const now = new Date()
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday)
    startOfYesterday.setDate(startOfYesterday.getDate() - 1)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Vues ce mois
    const { count: viewsMonth } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('event_type', 'page_view')
      .gte('created_at', startOfMonth.toISOString())

    // Vues aujourd'hui
    const { count: viewsToday } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('event_type', 'page_view')
      .gte('created_at', startOfToday.toISOString())

    // Vues hier
    const { count: viewsYesterday } = await supabase
      .from('analytics_events')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurantId)
      .eq('event_type', 'page_view')
      .gte('created_at', startOfYesterday.toISOString())
      .lt('created_at', startOfToday.toISOString())

    // Top items (add_to_cart ce mois)
    const { data: cartEvents } = await supabase
      .from('analytics_events')
      .select('item_id, item_name')
      .eq('restaurant_id', restaurantId)
      .eq('event_type', 'add_to_cart')
      .gte('created_at', startOfMonth.toISOString())
      .not('item_id', 'is', null)

    // Agréger les tops items côté JS
    const itemCounts: Record<string, { item_name: string; count: number }> = {}
    for (const ev of cartEvents || []) {
      if (!ev.item_id) continue
      if (!itemCounts[ev.item_id]) {
        itemCounts[ev.item_id] = { item_name: ev.item_name || 'Plat inconnu', count: 0 }
      }
      itemCounts[ev.item_id].count++
    }

    const topItems = Object.entries(itemCounts)
      .map(([item_id, val]) => ({ item_id, ...val }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3)

    return NextResponse.json({
      page_views_this_month: viewsMonth ?? 0,
      page_views_today: viewsToday ?? 0,
      page_views_yesterday: viewsYesterday ?? 0,
      top_items: topItems,
    })
  } catch (err) {
    console.error('analytics stats error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
