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

    const body = await request.json()
    const { id, name, slug, city, shop_category, description, whatsapp_number, phone,
      facebook_url, instagram_url, tiktok_url, snapchat_url,
      wave_number, orange_money_number, delivery_info, show_delivery_info,
      is_verified, is_active, is_founder, primary_color, theme, logo_url, cover_url } = body
    if (!id) return NextResponse.json({ error: 'id requis' }, { status: 400 })

    const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (typeof name === 'string') payload.name = name
    if (typeof slug === 'string' && slug) payload.slug = slug
    if (typeof city === 'string') payload.city = city || null
    if (typeof shop_category === 'string') payload.shop_category = shop_category || null
    if (typeof description === 'string') payload.description = description || null
    if (typeof whatsapp_number === 'string') payload.whatsapp_number = whatsapp_number
    if (typeof phone === 'string') payload.phone = phone || null
    if (typeof facebook_url === 'string') payload.facebook_url = facebook_url || null
    if (typeof instagram_url === 'string') payload.instagram_url = instagram_url || null
    if (typeof tiktok_url === 'string') payload.tiktok_url = tiktok_url || null
    if (typeof snapchat_url === 'string') payload.snapchat_url = snapchat_url || null
    if (typeof wave_number === 'string') payload.wave_number = wave_number || null
    if (typeof orange_money_number === 'string') payload.orange_money_number = orange_money_number || null
    if (typeof delivery_info === 'string') payload.delivery_info = delivery_info || null
    if (typeof show_delivery_info === 'boolean') payload.show_delivery_info = show_delivery_info
    if (typeof is_verified === 'boolean') payload.is_verified = is_verified
    if (typeof is_active === 'boolean') payload.is_active = is_active
    if (typeof is_founder === 'boolean') payload.is_founder = is_founder
    if (typeof logo_url === 'string') payload.logo_url = logo_url || null
    if (typeof cover_url === 'string') payload.cover_url = cover_url || null

    // Custom colors/theme are a Pro feature — Starter always keeps TerangaSpot's defaults
    const { data: sub } = await supabase.from('subscriptions').select('plan').eq('boutique_id', id).single()
    const isPro = sub?.plan === 'pro'
    payload.primary_color = isPro && typeof primary_color === 'string' ? primary_color : '#7C3AED'
    payload.theme = isPro && typeof theme === 'string' ? theme : 'light'

    const { error } = await supabase.from('boutiques').update(payload).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('edit-boutique error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
