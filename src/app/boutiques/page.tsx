import { Fragment } from 'react'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Store, ArrowRight, Heart } from 'lucide-react'
import { SHOP_CATEGORY_FILTER_OPTIONS } from '@/lib/categories'
import { Footer } from '@/components/layout/Footer'
import { Logo } from '@/components/ui/Logo'
import type { Metadata } from 'next'
import { BoutiquesHero } from './BoutiquesHero'
import { TendancesCarousel, type TrendItem } from './TendancesCarousel'
import { DirectoryProductCard } from './DirectoryProductCard'
import { StoriesBar, type StoryBoutique } from './StoriesBar'
import { FeaturedBlock } from '@/components/annuaire/FeaturedBlock'
import { diversify } from '@/lib/utils/ranking'

export const metadata: Metadata = {
  title: 'Annuaire des boutiques — TerangaSpot',
  description: 'Découvrez tous les articles des boutiques du Sénégal sur TerangaSpot. Mode, beauté, électronique et plus.',
}

export const dynamic = 'force-dynamic'
export const revalidate = 0

type Sort = 'score' | 'price_asc' | 'price_desc'

interface Props {
  searchParams: { q?: string; category?: string; city?: string; sort?: string; page?: string }
}

const PAGE_SIZE = 14

function buildParams(params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') sp.set(key, String(value))
  }
  return sp.toString()
}

interface DirectoryBoutique {
  id: string
  slug: string
  name: string
  logo_url: string | null
  city: string | null
  shop_category: string | null
  is_verified: boolean
  is_founder: boolean
  is_active: boolean
  is_demo: boolean
}

interface DirectoryProduct {
  id: string
  slug: string
  name: string
  price: number
  discount_percent: number | null
  image_url: string | null
  description: string | null
  created_at: string
  boutique_id: string
  boutiques: DirectoryBoutique | DirectoryBoutique[]
}

const PRODUCT_SELECT = `
  id, slug, name, price, discount_percent, image_url, description, created_at, boutique_id,
  boutiques!inner(id, slug, name, logo_url, city, shop_category, is_verified, is_founder, is_active, is_demo)
`

function normalizeBoutique<T>(b: T | T[]): T {
  return Array.isArray(b) ? b[0] : b
}

// Score de pertinence d'un produit : complétude de la fiche, note de la
// boutique, ventes livrées récentes, statut vérifié et fraîcheur — pas de
// mise en avant payante, un classement objectif pour tout le monde.
function scoreProduit(
  produit: { image_url: string | null; description: string | null; price: number; created_at: string },
  boutique: { is_verified: boolean },
  avgRating: number,
  deliveredCount: number,
): number {
  let score = 0

  if (produit.image_url) score += 20
  if (produit.description && produit.description.length > 20) score += 10
  if (produit.price > 0) score += 10

  if (avgRating > 0) score += avgRating * 6

  score += Math.min(deliveredCount * 2, 20)

  if (boutique.is_verified) score += 10

  const age = Date.now() - new Date(produit.created_at).getTime()
  if (age < 7 * 24 * 60 * 60 * 1000) score += 8

  if (!produit.image_url) score -= 50

  return score
}

export default async function BoutiquesPage({ searchParams }: Props) {
  const supabase = createClient()
  const { q, category, city } = searchParams
  const sort: Sort = searchParams.sort === 'price_asc' || searchParams.sort === 'price_desc' ? searchParams.sort : 'score'
  const parsedPage = parseInt(searchParams.page ?? '1', 10)
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1

  let query = supabase
    .from('products')
    .select(PRODUCT_SELECT)
    .eq('is_available', true)
    .eq('boutiques.is_active', true)
    .eq('boutiques.is_demo', false)

  if (category && category !== 'Toutes les catégories') query = query.eq('boutiques.shop_category', category)
  if (city) query = query.ilike('boutiques.city', `%${city}%`)

  let products: DirectoryProduct[] = []

  if (q) {
    // Recherche produit : le produit s'affiche directement.
    const { data: byProduct, error: byProductError } = await query.ilike('name', `%${q}%`).limit(100)
    if (byProductError) console.error('boutiques search (product) error:', byProductError.message)

    // Recherche boutique : on retrouve tous ses produits.
    const { data: matchingBoutiques } = await supabase
      .from('boutiques')
      .select('id')
      .ilike('name', `%${q}%`)
      .eq('is_active', true)
      .eq('is_demo', false)
      .limit(50)
    const boutiqueIds = (matchingBoutiques ?? []).map(b => b.id)

    let byBoutique: DirectoryProduct[] = []
    if (boutiqueIds.length) {
      let boutiqueProductsQuery = supabase
        .from('products')
        .select(PRODUCT_SELECT)
        .eq('is_available', true)
        .in('boutique_id', boutiqueIds)
      if (category && category !== 'Toutes les catégories') boutiqueProductsQuery = boutiqueProductsQuery.eq('boutiques.shop_category', category)
      if (city) boutiqueProductsQuery = boutiqueProductsQuery.ilike('boutiques.city', `%${city}%`)
      const { data } = await boutiqueProductsQuery.limit(200)
      byBoutique = (data ?? []) as unknown as DirectoryProduct[]
    }

    const merged = new Map<string, DirectoryProduct>()
    for (const p of [...(byProduct ?? []), ...byBoutique] as unknown as DirectoryProduct[]) merged.set(p.id, p)
    products = Array.from(merged.values())
  } else {
    const { data, error } = await query.limit(120)
    if (error) console.error('boutiques query error:', error.message)
    products = (data ?? []) as unknown as DirectoryProduct[]
  }

  const boutiqueIds = Array.from(new Set(products.map(p => p.boutique_id)))

  // Note moyenne par boutique — utilisée dans le score de pertinence.
  const avgRatingByBoutique = new Map<string, number>()
  if (boutiqueIds.length) {
    const { data: reviewRows } = await supabase
      .from('reviews')
      .select('boutique_id, rating')
      .eq('is_visible', true)
      .in('boutique_id', boutiqueIds)
    const sums = new Map<string, { total: number; count: number }>()
    for (const r of reviewRows ?? []) {
      const s = sums.get(r.boutique_id) ?? { total: 0, count: 0 }
      s.total += r.rating
      s.count += 1
      sums.set(r.boutique_id, s)
    }
    sums.forEach((s, id) => avgRatingByBoutique.set(id, s.total / s.count))
  }

  // Commandes livrées ce mois-ci par boutique — utilisées dans le score de pertinence.
  const deliveredCountByBoutique = new Map<string, number>()
  if (boutiqueIds.length) {
    const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const { data: deliveredOrders } = await supabase
      .from('orders')
      .select('boutique_id')
      .eq('status', 'delivered')
      .gte('created_at', monthStart)
      .in('boutique_id', boutiqueIds)
      .limit(5000)
    for (const o of deliveredOrders ?? []) {
      deliveredCountByBoutique.set(o.boutique_id, (deliveredCountByBoutique.get(o.boutique_id) ?? 0) + 1)
    }
  }

  const scored = products.map(p => {
    const boutique = normalizeBoutique(p.boutiques)
    const score = scoreProduit(
      p,
      boutique,
      avgRatingByBoutique.get(p.boutique_id) ?? 0,
      deliveredCountByBoutique.get(p.boutique_id) ?? 0,
    )
    return { product: p, boutique, score, boutique_id: p.boutique_id }
  })

  let rankedProducts = scored
  if (sort === 'price_asc') {
    rankedProducts = [...scored].sort((a, b) => (a.product.price ?? 0) - (b.product.price ?? 0))
  } else if (sort === 'price_desc') {
    rankedProducts = [...scored].sort((a, b) => (b.product.price ?? 0) - (a.product.price ?? 0))
  } else {
    // Diversifie l'ordre par pertinence pour éviter qu'une seule boutique monopolise la page.
    rankedProducts = diversify([...scored].sort((a, b) => b.score - a.score))
  }

  const totalPages = Math.max(1, Math.ceil(rankedProducts.length / PAGE_SIZE))
  const pageProducts = rankedProducts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  // Fetch trending: best-selling product per active boutique (gracefully skipped if table missing)
  let trending: TrendItem[] = []
  try {
    const { data: trendingRaw } = await supabase
      .from('order_items')
      .select('product_id, quantity, products(name, price, image_url, boutique_id, boutiques(name, slug, is_active))')
      .limit(500)

    const trendMap = new Map<string, TrendItem>()
    for (const item of (trendingRaw ?? []) as unknown[]) {
      const i = item as {
        product_id: string; quantity: number;
        products: { name: string; price: number; image_url: string | null; boutique_id: string; boutiques: { name: string; slug: string; is_active: boolean } | null } | null
      }
      if (!i.products?.boutiques?.is_active) continue
      const slug = i.products.boutiques.slug
      const existing = trendMap.get(slug)
      const count = (existing?.order_count ?? 0) + (i.quantity ?? 1)
      if (!existing || count > existing.order_count) {
        trendMap.set(slug, {
          boutique_slug: slug,
          boutique_name: i.products.boutiques.name,
          product_name: i.products.name,
          product_image: i.products.image_url,
          product_price: i.products.price,
          order_count: count,
        })
      }
    }
    trending = Array.from(trendMap.values()).sort((a, b) => b.order_count - a.order_count).slice(0, 12)
  } catch {
    // Table may not exist yet — carousel hidden
  }

  // Boutiques avec au moins une story active — pour la barre de stories sous le hero.
  let storyBoutiques: StoryBoutique[] = []
  try {
    const { data: activeStoryRows } = await supabase
      .from('boutique_stories')
      .select('id, boutique_id, created_at, boutiques!inner(id, slug, name, logo_url, is_active, is_demo)')
      .gt('expires_at', new Date().toISOString())
      .eq('boutiques.is_active', true)
      .eq('boutiques.is_demo', false)
      .order('created_at', { ascending: true })

    const byBoutique = new Map<string, StoryBoutique>()
    for (const row of (activeStoryRows ?? []) as unknown as { id: string; boutique_id: string; boutiques: DirectoryBoutique | DirectoryBoutique[] }[]) {
      const b = normalizeBoutique(row.boutiques)
      const existing = byBoutique.get(b.id)
      if (existing) existing.storyIds.push(row.id)
      else byBoutique.set(b.id, { id: b.id, slug: b.slug, name: b.name, logo_url: b.logo_url, storyIds: [row.id] })
    }
    storyBoutiques = Array.from(byBoutique.values())
  } catch {
    // Table peut ne pas exister tant que la migration n'est pas appliquée — barre masquée.
  }

  // Blocs "Coup de cœur" configurés par le super-admin (une ou plusieurs boutiques par bloc).
  type FeaturedBoutique = {
    name: string; slug: string; logo_url: string | null; city: string | null
    shop_category: string | null; primary_color: string | null
    products: { name: string; price: number; image_url: string | null; is_available: boolean; position: number }[]
  }
  type FeaturedItem = { boutique: FeaturedBoutique; products: FeaturedBoutique['products'] }
  let blocksTop: { id: string; title: string; items: FeaturedItem[] }[] = []
  let blocksMid: { id: string; title: string; items: FeaturedItem[] }[] = []
  try {
    const { data: featuredBlocks } = await supabase
      .from('featured_blocks')
      .select(`
        id, title, position, page_number, sort_order,
        featured_block_items(
          sort_order,
          boutiques(
            name, slug, logo_url, city, shop_category, primary_color,
            products(name, price, image_url, is_available, position)
          )
        )
      `)
      .eq('is_active', true)
      .order('sort_order')

    type BlockItemRow = { sort_order: number; boutiques: FeaturedBoutique | FeaturedBoutique[] | null }
    const buildItems = (rows: BlockItemRow[] | null | undefined): FeaturedItem[] =>
      (rows ?? [])
        .slice()
        .sort((a, b) => a.sort_order - b.sort_order)
        .map(item => normalizeBoutique(item.boutiques as FeaturedBoutique | FeaturedBoutique[]))
        .filter((boutique): boutique is FeaturedBoutique => Boolean(boutique))
        .map(boutique => ({
          boutique,
          products: boutique.products.filter(p => p.is_available).sort((a, b) => a.position - b.position).slice(0, 4),
        }))

    const normalized = (featuredBlocks ?? [])
      .map(b => ({ ...b, items: buildItems(b.featured_block_items as unknown as BlockItemRow[]) }))
      .filter(b => b.items.length > 0)

    blocksTop = normalized
      .filter(b => b.position === 'top' && (b.page_number ?? 1) === page)
      .map(b => ({ id: b.id, title: b.title, items: b.items }))
    blocksMid = normalized
      .filter(b => b.position === 'mid' && (b.page_number ?? 1) === page)
      .map(b => ({ id: b.id, title: b.title, items: b.items }))
  } catch {
    // Table peut ne pas exister tant que la migration n'est pas appliquée — blocs masqués.
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#F9FAFB' }}>

      <div style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #F3F4F6' }} className="sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between gap-2">
          <Link href="/" className="shrink-0"><Logo textClassName="font-bold text-xl" textStyle={{ color: '#111111' }} /></Link>
          <div className="flex items-center gap-2">
            <Link href="/favoris"
              className="w-9 h-9 rounded-lg flex items-center justify-center border border-gray-200 hover:border-gray-300 transition-colors"
              aria-label="Mes favoris">
              <Heart className="w-4 h-4 text-gray-600" />
            </Link>
            <Link href="/pour-les-boutiques"
              className="text-sm font-semibold px-3 sm:px-4 py-2 rounded-xl text-white transition-colors hover:opacity-90 whitespace-nowrap"
              style={{ backgroundColor: '#F97316' }}>
              Créer ma boutique
            </Link>
          </div>
        </div>
      </div>

      <BoutiquesHero
        q={q}
        category={category}
        city={city}
        sort={sort}
        categoryOptions={SHOP_CATEGORY_FILTER_OPTIONS}
      />

      <StoriesBar boutiques={storyBoutiques} />

      {!q && !category && !city && <TendancesCarousel items={trending} />}

      <div className="max-w-6xl mx-auto px-4 py-10 flex-1">

        {blocksTop.map(block => (
          <FeaturedBlock key={block.id} title={block.title} items={block.items} />
        ))}

        {rankedProducts.length > 0 && (
          <p className="text-sm text-gray-500 mb-6">
            <span className="font-semibold text-gray-900">{rankedProducts.length}</span> produit{rankedProducts.length > 1 ? 's' : ''}
            {q ? ` pour "${q}"` : ''}
          </p>
        )}

        {!rankedProducts.length ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 flex items-center justify-center mb-4">
              <Store className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Aucun produit trouvé</p>
            <p className="text-xs text-gray-400 mt-1">Essayez d&apos;autres filtres</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 sm:gap-6">
            {pageProducts.map(({ product: p, boutique: b }, index) => (
              <Fragment key={p.id}>
                <DirectoryProductCard product={p} boutique={b} />
                {index === 7 && blocksMid.map(block => (
                  <div key={block.id} className="col-span-2 sm:col-span-3 lg:col-span-5">
                    <FeaturedBlock title={block.title} items={block.items} />
                  </div>
                ))}
              </Fragment>
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8 pb-8 flex-wrap">
            {page > 1 && (
              <Link href={`/boutiques?${buildParams({ ...searchParams, page: page - 1 })}`}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-brand-orange hover:text-brand-orange transition-colors">
                ← Précédent
              </Link>
            )}
            {/* Numéros de page : liste complète à partir de sm, remplacée par un
                indicateur compact sur mobile pour éviter tout débordement horizontal. */}
            <div className="hidden sm:flex items-center gap-2 flex-wrap justify-center">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                <Link key={n} href={`/boutiques?${buildParams({ ...searchParams, page: n })}`}
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-medium transition-colors"
                  style={n === page
                    ? { backgroundColor: '#F97316', color: '#FFFFFF' }
                    : { border: '1px solid #E5E7EB', color: '#6B7280' }}>
                  {n}
                </Link>
              ))}
            </div>
            <span className="sm:hidden text-sm font-medium text-gray-500 px-2">Page {page} / {totalPages}</span>
            {page < totalPages && (
              <Link href={`/boutiques?${buildParams({ ...searchParams, page: page + 1 })}`}
                className="px-4 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:border-brand-orange hover:text-brand-orange transition-colors">
                Suivant →
              </Link>
            )}
          </div>
        )}

        <section className="mt-16 rounded-3xl p-10 text-center" style={{ backgroundColor: '#F5F3FF', border: '1px solid #DDD6FE' }}>
          <h2 className="text-2xl sm:text-3xl font-black mb-3" style={{ color: '#111111' }}>
            Vous avez une boutique ?
          </h2>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Rejoignez l&apos;annuaire TerangaSpot et donnez de la visibilité à votre boutique auprès de milliers de clients au Sénégal.
          </p>
          <Link href="/pour-les-boutiques"
            className="inline-flex items-center gap-2 font-bold text-sm px-7 py-3.5 rounded-xl text-white transition-all hover:opacity-90"
            style={{ backgroundColor: '#F97316' }}>
            <Store className="w-4 h-4" />
            Rejoindre l&apos;annuaire TerangaSpot
            <ArrowRight className="w-4 h-4" />
          </Link>
        </section>
      </div>

      <Footer />
    </div>
  )
}
