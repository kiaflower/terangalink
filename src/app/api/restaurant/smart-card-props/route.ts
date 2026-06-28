import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('restaurant_id').eq('id', user.id).single()
  const restaurantId = (profile as { restaurant_id?: string } | null)?.restaurant_id
  if (!restaurantId) return NextResponse.json({ error: 'Pas de restaurant' }, { status: 404 })

  const admin = createAdminClient()

  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [
    { data: resto },
    { data: sub },
    { count: menuCount },
    { count: totalOrders },
    { count: todayOrders },
    { data: lastMenuItem },
    { data: lastOrder },
    { data: featuredItem },
  ] = await Promise.all([
    admin.from('restaurants').select('wave_number, orange_money_number, whatsapp_number, created_at').eq('id', restaurantId).single(),
    admin.from('subscriptions').select('plan').eq('restaurant_id', restaurantId).single(),
    admin.from('menu_items').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).eq('is_available', true),
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).not('status', 'in', '("cancelled","delivery_cancelled")'),
    admin.from('orders').select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId).gte('created_at', todayStart).not('status', 'in', '("cancelled","delivery_cancelled")'),
    admin.from('menu_items').select('updated_at').eq('restaurant_id', restaurantId).order('updated_at', { ascending: false }).limit(1),
    admin.from('orders').select('created_at').eq('restaurant_id', restaurantId).order('created_at', { ascending: false }).limit(1),
    admin.from('menu_items').select('id').eq('restaurant_id', restaurantId).eq('is_featured', true).limit(1),
  ])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = resto as any

  return NextResponse.json({
    restaurantId,
    plan: (sub as { plan?: string } | null)?.plan ?? 'starter',
    menuItemsCount: menuCount ?? 0,
    hasWhatsapp: !!r?.whatsapp_number,
    hasWave: !!r?.wave_number,
    hasOrangeMoney: !!r?.orange_money_number,
    hasFeaturedProduct: (featuredItem?.length ?? 0) > 0,
    lastMenuUpdate: (lastMenuItem as { updated_at?: string }[] | null)?.[0]?.updated_at ?? null,
    lastOrderDate: (lastOrder as { created_at?: string }[] | null)?.[0]?.created_at ?? null,
    restaurantCreatedAt: r?.created_at ?? now.toISOString(),
    totalOrders: totalOrders ?? 0,
    todayOrders: todayOrders ?? 0,
  })
}
