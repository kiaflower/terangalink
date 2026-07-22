// Phase 2 — étape 3/3 : compare app.* (nouveau fork) au rapport de contrôle
// écrit par migrate-export-verify.mjs, + vérifie l'absence de FK orphelines.
// Usage : node scripts/migrate-verify.mjs

import { readFileSync } from 'node:fs'
import { getAppClient, RESTAURANTS } from './lib/migrate-env.mjs'

const app = getAppClient()

const controlPath = '/private/tmp/claude-501/-Users-rokhqyq-Desktop-Teranga-Link-terangalink/ee96abe2-3cf1-4424-a3a3-80c2f75f8419/scratchpad/migrate-control.json'
const control = JSON.parse(readFileSync(controlPath, 'utf-8'))

let failures = 0

async function countFor(table, restaurantId) {
  const { count, error } = await app.from(table).select('*', { count: 'exact', head: true }).eq('restaurant_id', restaurantId)
  if (error) throw new Error(`${table}/${restaurantId}: ${error.message}`)
  return count ?? 0
}

console.log('=== Comparaison des comptes par restaurant ===')
for (const r of RESTAURANTS) {
  const expected = control.restaurants[r.id]
  if (!expected) {
    console.log(`${r.name}: absent du rapport de contrôle — relancer migrate-export-verify.mjs`)
    failures++
    continue
  }
  console.log(`\n${r.name} (${r.id})`)

  const { data: restRow, error: restErr } = await app.from('restaurants').select('id, name, slug').eq('id', r.id).maybeSingle()
  const restOk = !restErr && restRow
  console.log(`  restaurants: ${restOk ? 'OK' : 'MANQUANT'}${restOk ? ` (${restRow.name}, /${restRow.slug})` : ''}`)
  if (!restOk) failures++

  for (const table of ['menu_categories', 'menu_items', 'promo_codes', 'orders', 'reviews']) {
    const exp = expected.counts[table] ?? 0
    const got = await countFor(table, r.id)
    const ok = exp === got
    console.log(`  ${table}: ${got}/${exp} attendu ${ok ? '' : '  <-- ÉCART'}`)
    if (!ok) failures++
  }

  const { data: itemIds } = await app.from('menu_items').select('id').eq('restaurant_id', r.id)
  const ids = (itemIds ?? []).map(i => i.id)
  let variantGroupCount = 0
  let variantOptionCount = 0
  if (ids.length) {
    const { data: groups } = await app.from('menu_item_variants').select('options').in('menu_item_id', ids)
    variantGroupCount = groups?.length ?? 0
    variantOptionCount = (groups ?? []).reduce((sum, g) => sum + (g.options?.length ?? 0), 0)
  }
  const expVariantOptions = expected.counts.menu_item_variants ?? 0
  const variantOk = variantOptionCount === expVariantOptions
  console.log(`  menu_item_variants: ${variantGroupCount} groupes / ${variantOptionCount} options (attendu ${expVariantOptions} options) ${variantOk ? '' : '  <-- ÉCART'}`)
  if (!variantOk) failures++

  const { count: profileCount } = await app.from('profiles').select('*', { count: 'exact', head: true }).eq('restaurant_id', r.id)
  const profOk = (profileCount ?? 0) === (expected.counts.profiles ?? 0)
  console.log(`  profiles: ${profileCount}/${expected.counts.profiles} attendu ${profOk ? '' : '  <-- ÉCART'}`)
  if (!profOk) failures++

  const { count: subCount } = await app.from('subscriptions').select('*', { count: 'exact', head: true }).eq('restaurant_id', r.id)
  const subOk = (subCount ?? 0) === (expected.counts.subscriptions ?? 0)
  console.log(`  subscriptions: ${subCount}/${expected.counts.subscriptions} attendu ${subOk ? '' : '  <-- ÉCART'}`)
  if (!subOk) failures++
}

console.log('\n=== Comptes super-admin ===')
const { count: saCount } = await app.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'super_admin')
const saOk = (saCount ?? 0) >= (control.superAdmins?.count ?? 0)
console.log(`profiles super_admin: ${saCount} (attendu >= ${control.superAdmins?.count}) ${saOk ? '' : '  <-- ÉCART'}`)
if (!saOk) failures++

console.log('\n=== FK orphelines ===')
const restaurantIds = RESTAURANTS.map(r => r.id)

const { data: allItems } = await app.from('menu_items').select('id, category_id').in('restaurant_id', restaurantIds)
const { data: allCategories } = await app.from('menu_categories').select('id').in('restaurant_id', restaurantIds)
const categoryIdSet = new Set((allCategories ?? []).map(c => c.id))
const orphanCategoryRefs = (allItems ?? []).filter(i => i.category_id && !categoryIdSet.has(i.category_id))
console.log(`menu_items.category_id orphelins: ${orphanCategoryRefs.length} ${orphanCategoryRefs.length === 0 ? 'OK' : '  <-- ÉCART'}`)
if (orphanCategoryRefs.length) failures++

// (menu_item_variants.menu_item_id ne peut pas être orphelin ici : les groupes
// sont générés directement à partir des menu_items.id de ces 4 restaurants
// dans migrate-import.mjs — rien d'autre ne peut y avoir écrit entre-temps.)

const { data: allOrders } = await app.from('orders').select('id, restaurant_id').in('restaurant_id', restaurantIds)
const restaurantIdSet = new Set(restaurantIds)
const orphanOrderRefs = (allOrders ?? []).filter(o => !restaurantIdSet.has(o.restaurant_id))
console.log(`orders.restaurant_id hors périmètre: ${orphanOrderRefs.length} ${orphanOrderRefs.length === 0 ? 'OK' : '  <-- ÉCART'}`)

console.log(`\n${failures === 0 ? 'Tout est cohérent.' : `${failures} écart(s) détecté(s) — voir ci-dessus.`}`)
process.exit(failures === 0 ? 0 : 1)
