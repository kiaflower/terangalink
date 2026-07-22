import { createPublicClient } from '@/lib/supabase/public'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface SuggestionRow {
  id: string
  slug: string
  name: string
  price: number
  discount_percent: number | null
  image_url: string | null
  restaurants: { slug: string; name: string; is_active: boolean; is_demo: boolean } | { slug: string; name: string; is_active: boolean; is_demo: boolean }[]
}

function normalizeRestaurant<T>(b: T | T[]): T {
  return Array.isArray(b) ? b[0] : b
}

/**
 * Suggestions de plats de l'annuaire (restaurants autres que celle en cours) —
 * utilisé uniquement dans le bouton favoris des restaurants en plan Free, pour
 * exposer leurs visiteurs au reste de l'annuaire TerangaLink.
 */
export async function GET(req: NextRequest) {
  const excludeRestaurantId = req.nextUrl.searchParams.get('exclude')
  const supabase = createPublicClient()

  let query = supabase
    .from('products')
    .select('id, slug, name, price, discount_percent, image_url, restaurants!inner(slug, name, is_active, is_demo)')
    .eq('is_available', true)
    .eq('restaurants.is_active', true)
    .eq('restaurants.is_demo', false)
    .limit(60)

  if (excludeRestaurantId) query = query.neq('restaurant_id', excludeRestaurantId)

  const { data } = await query
  const rows = (data ?? []) as unknown as SuggestionRow[]
  const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 6)

  const products = shuffled.map(p => {
    const restaurant = normalizeRestaurant(p.restaurants)
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      discount_percent: p.discount_percent,
      image_url: p.image_url,
      restaurant_slug: restaurant.slug,
      restaurant_name: restaurant.name,
    }
  })

  return NextResponse.json({ products })
}
