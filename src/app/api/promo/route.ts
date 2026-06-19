import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')?.trim().toUpperCase()
  const restaurant_id = searchParams.get('restaurant_id')

  if (!code || !restaurant_id) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const adminClient = createAdminClient()

  const { data, error } = await adminClient
    .from('promo_codes')
    .select('id, code, discount_type, discount_value, min_order_amount, starts_at, expires_at, max_uses, used_count, is_active')
    .eq('code', code)
    .eq('restaurant_id', restaurant_id)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Code promo invalide' }, { status: 404 })
  }

  if (!data.is_active) {
    return NextResponse.json({ error: 'Ce code promo est inactif' }, { status: 400 })
  }

  const now = new Date()

  if (data.starts_at && now < new Date(data.starts_at)) {
    return NextResponse.json({ error: 'Ce code promo n\'est pas encore actif' }, { status: 400 })
  }

  if (data.expires_at && now > new Date(data.expires_at)) {
    return NextResponse.json({ error: 'Ce code promo a expiré' }, { status: 400 })
  }

  if (data.max_uses !== null && data.used_count >= data.max_uses) {
    return NextResponse.json({ error: 'Ce code promo a atteint sa limite d\'utilisation' }, { status: 400 })
  }

  return NextResponse.json({ success: true, data })
}
