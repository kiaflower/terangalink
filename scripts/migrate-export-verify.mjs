// Phase 2 — étape 1/3 : lecture seule sur public (ancien TerangaLink).
// Compte les lignes par table pour les 4 restaurants réels, écrit un JSON de
// contrôle utilisé par migrate-verify.mjs pour comparer avant/après import.
// Usage : node scripts/migrate-export-verify.mjs

import { writeFileSync } from 'node:fs'
import { getPublicClient, RESTAURANTS, RESTAURANT_IDS } from './lib/migrate-env.mjs'

const supabase = getPublicClient()

async function countFor(table, restaurantId) {
  const { count, error } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('restaurant_id', restaurantId)
  if (error) throw new Error(`${table}/${restaurantId}: ${error.message}`)
  return count ?? 0
}

const TABLES = ['menu_categories', 'menu_items', 'menu_item_variants', 'promo_codes', 'orders', 'reviews']

const report = { generatedAt: new Date().toISOString(), restaurants: {} }

for (const r of RESTAURANTS) {
  console.log(`\n${r.name} (${r.id})`)
  report.restaurants[r.id] = { name: r.name, counts: {} }

  const { data: restaurantRow, error: restErr } = await supabase.from('restaurants').select('*').eq('id', r.id).single()
  if (restErr) throw new Error(`restaurants/${r.id}: ${restErr.message}`)
  report.restaurants[r.id].counts.restaurants = 1
  console.log(`  restaurants: 1 (${restaurantRow.name}, plan via subscriptions)`)

  for (const table of TABLES) {
    if (table === 'menu_item_variants') continue
    const c = await countFor(table, r.id)
    report.restaurants[r.id].counts[table] = c
    console.log(`  ${table}: ${c}`)
  }

  const { data: menuItemIds } = await supabase.from('menu_items').select('id').eq('restaurant_id', r.id)
  const ids = (menuItemIds ?? []).map(m => m.id)
  let variantTotal = 0
  if (ids.length) {
    const { count } = await supabase.from('menu_item_variants').select('*', { count: 'exact', head: true }).in('menu_item_id', ids)
    variantTotal = count ?? 0
  }
  report.restaurants[r.id].counts.menu_item_variants = variantTotal
  console.log(`  menu_item_variants: ${variantTotal}`)

  const { count: profileCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('restaurant_id', r.id)
  report.restaurants[r.id].counts.profiles = profileCount ?? 0
  console.log(`  profiles: ${profileCount ?? 0}`)

  const { count: subCount } = await supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('restaurant_id', r.id)
  report.restaurants[r.id].counts.subscriptions = subCount ?? 0
  console.log(`  subscriptions: ${subCount ?? 0}`)
}

const { count: superAdminCount, data: superAdmins } = await supabase
  .from('profiles')
  .select('id, email', { count: 'exact' })
  .eq('role', 'super_admin')
report.superAdmins = { count: superAdminCount ?? 0, emails: (superAdmins ?? []).map(p => p.email) }
console.log(`\nsuper_admin profiles (hors restaurant): ${superAdminCount ?? 0} — ${(superAdmins ?? []).map(p => p.email).join(', ')}`)

const outPath = '/private/tmp/claude-501/-Users-rokhqyq-Desktop-Teranga-Link-terangalink/ee96abe2-3cf1-4424-a3a3-80c2f75f8419/scratchpad/migrate-control.json'
writeFileSync(outPath, JSON.stringify(report, null, 2))
console.log(`\nRapport de contrôle écrit : ${outPath}`)
