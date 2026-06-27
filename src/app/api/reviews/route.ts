import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { restaurant_id, order_id, customer_name, rating, comment } = body

    if (!restaurant_id || !rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Données invalides' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Vérifier si un avis existe déjà pour cette commande
    if (order_id) {
      const { data: existing } = await admin
        .from('reviews')
        .select('id')
        .eq('order_id', order_id)
        .limit(1)
        .single()

      if (existing) {
        return NextResponse.json({ error: 'Un avis existe déjà pour cette commande' }, { status: 409 })
      }
    }

    const { error } = await admin.from('reviews').insert({
      restaurant_id,
      order_id: order_id || null,
      customer_name: customer_name || null,
      rating,
      comment: comment || null,
      is_visible: true,
    })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const restaurantId = searchParams.get('restaurant_id')
  if (!restaurantId) return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reviews')
    .select('id, customer_name, rating, comment, created_at')
    .eq('restaurant_id', restaurantId)
    .eq('is_visible', true)
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ data })
}
