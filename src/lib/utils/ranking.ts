export function scoreProduit(produit: {
  image_url?: string | null
  description?: string | null
  price?: number | null
  created_at: string
}): number {
  let score = 0
  if (produit.image_url) score += 20
  if (produit.description && produit.description.length > 20) score += 10
  if (produit.price && produit.price > 0) score += 10
  const age = Date.now() - new Date(produit.created_at).getTime()
  if (age < 7 * 24 * 60 * 60 * 1000) score += 8
  if (!produit.image_url) score -= 50
  return score
}

export function diversify<T extends { boutique_id: string }>(
  products: T[]
): T[] {
  const byBoutique = new Map<string, T[]>()
  for (const p of products) {
    const list = byBoutique.get(p.boutique_id) ?? []
    list.push(p)
    byBoutique.set(p.boutique_id, list)
  }
  const result: T[] = []
  const lists = Array.from(byBoutique.values())
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
