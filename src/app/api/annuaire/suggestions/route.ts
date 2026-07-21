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
  boutiques: { slug: string; name: string; is_active: boolean; is_demo: boolean } | { slug: string; name: string; is_active: boolean; is_demo: boolean }[]
}

function normalizeBoutique<T>(b: T | T[]): T {
  return Array.isArray(b) ? b[0] : b
}

/**
 * Suggestions de produits de l'annuaire (boutiques autres que celle en cours) —
 * utilisé uniquement dans le bouton favoris des boutiques en plan Free, pour
 * exposer leurs visiteurs au reste de l'annuaire TerangaSpot.
 */
export async function GET(req: NextRequest) {
  const excludeBoutiqueId = req.nextUrl.searchParams.get('exclude')
  const supabase = createPublicClient()

  let query = supabase
    .from('products')
    .select('id, slug, name, price, discount_percent, image_url, boutiques!inner(slug, name, is_active, is_demo)')
    .eq('is_available', true)
    .eq('boutiques.is_active', true)
    .eq('boutiques.is_demo', false)
    .limit(60)

  if (excludeBoutiqueId) query = query.neq('boutique_id', excludeBoutiqueId)

  const { data } = await query
  const rows = (data ?? []) as unknown as SuggestionRow[]
  const shuffled = rows.sort(() => Math.random() - 0.5).slice(0, 6)

  const products = shuffled.map(p => {
    const boutique = normalizeBoutique(p.boutiques)
    return {
      id: p.id,
      slug: p.slug,
      name: p.name,
      price: p.price,
      discount_percent: p.discount_percent,
      image_url: p.image_url,
      boutique_slug: boutique.slug,
      boutique_name: boutique.name,
    }
  })

  return NextResponse.json({ products })
}
