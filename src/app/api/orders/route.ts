import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, customer_name, customer_phone, items, total, notes } = body

    if (!restaurant_id || !items?.length || !total) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('orders')
      .insert({
        restaurant_id,
        customer_name: customer_name || null,
        customer_phone: customer_phone || null,
        items,
        total,
        notes: notes || null,
        status: 'pending',
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true, data })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
