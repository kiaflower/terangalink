import { cache } from 'react'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugifyToken, normalizeToken, isLooseMatch } from '@/lib/slug'
import { SPECIALTY_SYNONYMS } from '@/lib/specialty-synonyms'
import type { OpeningHoursMap } from '@/lib/opening-hours'

export interface TaxonomyEntry {
  slug: string
  label: string
  count: number
}

export interface RestaurantSummary {
  id: string
  name: string
  slug: string
  description: string | null
  city: string | null
  neighborhood: string | null
  cuisine_type: string | null
  logo_url: string | null
  cover_url: string | null
  opening_hours: OpeningHoursMap | null
  is_boosted?: boolean
  created_at: string
}

// En dessous de ce seuil, une spécialité n'est pas assez représentée pour
// justifier une page dédiée — ajustable sans changer la logique.
const MIN_RESTAURANTS_PER_SPECIALTY = 1

interface BaseRestaurantRow {
  id: string
  slug: string
  name: string
  city: string | null
  neighborhood: string | null
  cuisine_type: string | null
}

interface SpecialtyGroup {
  normalizedToken: string
  label: string
  restaurantIds: Set<string>
}

function toTitleCase(s: string): string {
  return s
    .trim()
    .split(/\s+/)
    .map(w => (w.length > 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(' ')
}

type AdminClient = ReturnType<typeof createAdminClient>

// La colonne `neighborhood` est récente : tant que la migration SQL n'a pas
// été appliquée en base, on l'ignore silencieusement (map vide) plutôt que de
// faire échouer la requête principale sur les restaurants.
async function fetchNeighborhoodMap(admin: AdminClient, restaurantIds: string[]): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (restaurantIds.length === 0) return map
  const { data } = await admin.from('restaurants').select('id, neighborhood').in('id', restaurantIds)
  for (const row of (data ?? []) as unknown as { id: string; neighborhood: string | null }[]) {
    map.set(row.id, row.neighborhood ?? null)
  }
  return map
}

// Mémoïsé par requête/build (React cache) — évite de refaire ces requêtes
// pour chaque page générée pendant generateStaticParams + rendu.
const fetchTaxonomyData = cache(async () => {
  const admin = createAdminClient()

  const { data: restaurants } = await admin
    .from('restaurants')
    .select('id, slug, name, city, cuisine_type')
    .eq('is_active', true)
    .eq('is_demo', false)

  const restaurantIdsForNeighborhood = (restaurants ?? []).map(r => r.id)
  const neighborhoodById = await fetchNeighborhoodMap(admin, restaurantIdsForNeighborhood)

  const baseRestaurants = (restaurants ?? []).map(r => ({
    ...r,
    neighborhood: neighborhoodById.get(r.id) ?? null,
  })) as BaseRestaurantRow[]
  const restaurantIds = baseRestaurants.map(r => r.id)

  const [{ data: categories }, { data: items }] = restaurantIds.length > 0
    ? await Promise.all([
      admin.from('menu_categories').select('restaurant_id, name').eq('is_active', true).in('restaurant_id', restaurantIds),
      admin.from('menu_items').select('restaurant_id, name').eq('is_available', true).in('restaurant_id', restaurantIds),
    ])
    : [{ data: [] }, { data: [] }]

  return {
    baseRestaurants,
    categories: (categories ?? []) as { restaurant_id: string; name: string }[],
    items: (items ?? []) as { restaurant_id: string; name: string }[],
  }
})

function computeSpecialtyGroups(
  baseRestaurants: BaseRestaurantRow[],
  categories: { restaurant_id: string; name: string }[],
  items: { restaurant_id: string; name: string }[]
): SpecialtyGroup[] {
  const raw: { token: string; restaurantId: string }[] = []
  for (const r of baseRestaurants) if (r.cuisine_type) raw.push({ token: r.cuisine_type, restaurantId: r.id })
  for (const c of categories) if (c.name) raw.push({ token: c.name, restaurantId: c.restaurant_id })
  for (const i of items) if (i.name) raw.push({ token: i.name, restaurantId: i.restaurant_id })

  const groups = new Map<string, SpecialtyGroup>()
  for (const { token, restaurantId } of raw) {
    const base = normalizeToken(token)
    if (!base) continue
    const normalized = SPECIALTY_SYNONYMS[base] ?? base
    const g = groups.get(normalized) ?? { normalizedToken: normalized, label: toTitleCase(token), restaurantIds: new Set<string>() }
    g.restaurantIds.add(restaurantId)
    groups.set(normalized, g)
  }

  // Fusion des groupes proches (ex: "pizza" / "pizzeria" / "pizzas")
  const sortedGroups = Array.from(groups.values()).sort((a, b) => b.restaurantIds.size - a.restaurantIds.size)
  const consumed = new Set<string>()
  const merged: SpecialtyGroup[] = []

  for (const group of sortedGroups) {
    if (consumed.has(group.normalizedToken)) continue
    for (const other of sortedGroups) {
      if (other === group || consumed.has(other.normalizedToken)) continue
      if (isLooseMatch(group.normalizedToken, other.normalizedToken)) {
        other.restaurantIds.forEach(id => group.restaurantIds.add(id))
        consumed.add(other.normalizedToken)
      }
    }
    merged.push(group)
    consumed.add(group.normalizedToken)
  }

  return merged
}

export async function getCityTaxonomy(): Promise<TaxonomyEntry[]> {
  const { baseRestaurants } = await fetchTaxonomyData()
  const groups = new Map<string, { label: string; restaurantIds: Set<string> }>()

  for (const r of baseRestaurants) {
    if (!r.city) continue
    const slug = slugifyToken(r.city)
    if (!slug) continue
    const g = groups.get(slug) ?? { label: toTitleCase(r.city), restaurantIds: new Set<string>() }
    g.restaurantIds.add(r.id)
    groups.set(slug, g)
  }

  return Array.from(groups.entries())
    .map(([slug, g]) => ({ slug, label: g.label, count: g.restaurantIds.size }))
    .sort((a, b) => b.count - a.count)
}

export async function getSpecialtyTaxonomy(): Promise<TaxonomyEntry[]> {
  const { baseRestaurants, categories, items } = await fetchTaxonomyData()
  const groups = computeSpecialtyGroups(baseRestaurants, categories, items)

  return groups
    .map(g => ({ slug: slugifyToken(g.normalizedToken), label: g.label, count: g.restaurantIds.size }))
    .filter(e => e.slug && e.count >= MIN_RESTAURANTS_PER_SPECIALTY)
    .sort((a, b) => b.count - a.count)
}

export async function getCityCategoryPairs(): Promise<{ citySlug: string; categorySlug: string }[]> {
  const { baseRestaurants, categories, items } = await fetchTaxonomyData()
  const groups = computeSpecialtyGroups(baseRestaurants, categories, items)

  const cityByRestaurant = new Map<string, string>()
  for (const r of baseRestaurants) {
    if (!r.city) continue
    const slug = slugifyToken(r.city)
    if (slug) cityByRestaurant.set(r.id, slug)
  }

  const pairs = new Map<string, { citySlug: string; categorySlug: string }>()
  for (const group of groups) {
    const categorySlug = slugifyToken(group.normalizedToken)
    if (!categorySlug) continue
    group.restaurantIds.forEach(restaurantId => {
      const citySlug = cityByRestaurant.get(restaurantId)
      if (!citySlug) return
      pairs.set(`${citySlug}/${categorySlug}`, { citySlug, categorySlug })
    })
  }

  return Array.from(pairs.values())
}

function sortRestaurants(restaurants: RestaurantSummary[]): RestaurantSummary[] {
  return [...restaurants].sort((a, b) => {
    if (!!a.is_boosted !== !!b.is_boosted) return a.is_boosted ? -1 : 1
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })
}

async function fetchAllActiveRestaurants(): Promise<RestaurantSummary[]> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('restaurants')
    .select('id, name, slug, description, city, cuisine_type, logo_url, cover_url, opening_hours, is_boosted, created_at')
    .eq('is_active', true)
    .eq('is_demo', false)

  const rows = (data ?? []) as unknown as (RestaurantSummary & Record<string, unknown>)[]
  const neighborhoodById = await fetchNeighborhoodMap(admin, rows.map(r => r.id))

  return rows.map(r => ({
    ...r,
    neighborhood: neighborhoodById.get(r.id) ?? null,
    is_boosted: r.is_boosted === true,
  }))
}

const fetchAllActiveRestaurantsCached = cache(fetchAllActiveRestaurants)

export async function getRestaurantsForCity(citySlug: string, opts?: { limit?: number }): Promise<RestaurantSummary[]> {
  const limit = opts?.limit ?? 60
  const restaurants = await fetchAllActiveRestaurantsCached()
  const filtered = restaurants.filter(r => r.city && slugifyToken(r.city) === citySlug)
  return sortRestaurants(filtered).slice(0, limit)
}

export async function getRestaurantsForCityAndSpecialty(
  citySlug: string,
  specialtySlug: string,
  opts?: { limit?: number }
): Promise<RestaurantSummary[]> {
  const limit = opts?.limit ?? 60
  const [restaurants, { baseRestaurants, categories, items }] = await Promise.all([
    fetchAllActiveRestaurantsCached(),
    fetchTaxonomyData(),
  ])

  const tokensByRestaurant = new Map<string, string[]>()
  const addToken = (restaurantId: string, token?: string | null) => {
    if (!token) return
    const arr = tokensByRestaurant.get(restaurantId) ?? []
    arr.push(token)
    tokensByRestaurant.set(restaurantId, arr)
  }
  for (const r of baseRestaurants) addToken(r.id, r.cuisine_type)
  for (const c of categories) addToken(c.restaurant_id, c.name)
  for (const i of items) addToken(i.restaurant_id, i.name)

  const filtered = restaurants.filter(r => {
    if (!r.city || slugifyToken(r.city) !== citySlug) return false
    const tokens = tokensByRestaurant.get(r.id) ?? []
    return tokens.some(t => isLooseMatch(t, specialtySlug))
  })

  return sortRestaurants(filtered).slice(0, limit)
}

export async function getSimilarRestaurants(
  restaurant: { id: string; city: string | null; neighborhood: string | null; cuisine_type: string | null },
  limit = 8
): Promise<RestaurantSummary[]> {
  const restaurants = await fetchAllActiveRestaurantsCached()
  const others = restaurants.filter(r => r.id !== restaurant.id)

  const citySlug = restaurant.city ? slugifyToken(restaurant.city) : null
  const neighborhoodSlug = restaurant.neighborhood ? slugifyToken(restaurant.neighborhood) : null

  const scored = others.map(r => {
    let score = 0
    const rCitySlug = r.city ? slugifyToken(r.city) : null
    const rNeighborhoodSlug = r.neighborhood ? slugifyToken(r.neighborhood) : null
    const sameCity = citySlug && rCitySlug === citySlug
    const sameNeighborhood = neighborhoodSlug && rNeighborhoodSlug === neighborhoodSlug
    const sameCuisine = restaurant.cuisine_type && r.cuisine_type &&
      isLooseMatch(restaurant.cuisine_type, r.cuisine_type)

    if (sameNeighborhood) score += 4
    if (sameCity && sameCuisine) score += 3
    if (sameCity) score += 2
    if (sameCuisine) score += 1

    return { r, score }
  }).filter(({ score }) => score > 0)

  scored.sort((a, b) => b.score - a.score)
  return scored.slice(0, limit).map(({ r }) => r)
}
