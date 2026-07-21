import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const { boutique_id, code, subtotal } = await req.json()

  if (!boutique_id || !code || typeof subtotal !== 'number') {
    return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
  }

  const admin = createAdminClient()

  // Les codes promo sont une fonctionnalité Pro — un downgrade vers Starter
  // doit désactiver les codes existants, pas seulement bloquer la création.
  const { data: subscription } = await admin
    .from('subscriptions')
    .select('plan')
    .eq('boutique_id', boutique_id)
    .single()
  if (subscription?.plan !== 'pro') {
    return NextResponse.json({ error: 'Code promo invalide' }, { status: 404 })
  }

  const { data: promo } = await admin
    .from('promo_codes')
    .select('*')
    .eq('boutique_id', boutique_id)
    .ilike('code', code.trim())
    .single()

  if (!promo || !promo.is_active) {
    return NextResponse.json({ error: 'Code promo invalide' }, { status: 404 })
  }
  if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Ce code promo a expiré' }, { status: 400 })
  }
  if (promo.max_uses != null && promo.uses_count >= promo.max_uses) {
    return NextResponse.json({ error: "Ce code promo n'est plus disponible" }, { status: 400 })
  }
  if (subtotal < promo.min_order_amount) {
    return NextResponse.json({ error: `Montant minimum requis : ${promo.min_order_amount} FCFA` }, { status: 400 })
  }

  const discount_amount = promo.discount_type === 'percent'
    ? Math.round((subtotal * promo.discount_value) / 100)
    : Math.min(promo.discount_value, subtotal)

  return NextResponse.json({ promo_code_id: promo.id, code: promo.code, discount_amount })
}
