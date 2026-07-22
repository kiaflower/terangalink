export function scorePlat(plat: {
  image_url?: string | null
  description?: string | null
  price?: number | null
  created_at: string
}): number {
  let score = 0
  if (plat.image_url) score += 20
  if (plat.description && plat.description.length > 20) score += 10
  if (plat.price && plat.price > 0) score += 10
  const age = Date.now() - new Date(plat.created_at).getTime()
  if (age < 7 * 24 * 60 * 60 * 1000) score += 8
  if (!plat.image_url) score -= 50
  return score
}

export function diversify<T extends { restaurant_id: string }>(
  products: T[]
): T[] {
  const byRestaurant = new Map<string, T[]>()
  for (const p of products) {
    const list = byRestaurant.get(p.restaurant_id) ?? []
    list.push(p)
    byRestaurant.set(p.restaurant_id, list)
  }
  const result: T[] = []
  const lists = Array.from(byRestaurant.values())
  let round = 0
  while (true) {
    let added = 0
    for (const list of lists) {
      if (list[round]) {
        result.push(list[round])
        added++
      }
    }
    if (added === 0) break
    round++
  }
  return result
}
