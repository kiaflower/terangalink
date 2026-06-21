import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  request: NextRequest,
  { params }: { params: { ref: string } }
) {
  const ref = params.ref
  const origin = request.nextUrl.origin

  const adminClient = createAdminClient()

  // Chercher par order_number (TL-000001) ou par début d'UUID
  const { data } = await adminClient
    .from('orders')
    .select('id, restaurant_id')
    .or(`order_number.eq.${ref},id.ilike.${ref}%`)
    .limit(1)
    .single()

  if (!data) {
    return NextResponse.redirect(`${origin}/404`)
  }

  // Redirect vers le dashboard restaurant (si connecté) ou page publique
  return NextResponse.redirect(
    `${origin}/dashboard/restaurant/orders?order=${data.id}`
  )
}
