// Phase 2 — étape 2/3 : lit public.* (ancien TerangaLink, lecture seule) pour
// les 4 restaurants réels, transforme selon le mapping documenté dans le plan,
// et upsert dans app.* (nouveau fork). Conserve les UUID d'origine partout sauf
// menu_item_variants (restructuration : une ligne par option -> une ligne par
// groupe de variantes). Idempotent — ré-exécutable sans créer de doublons.
//
// Usage : node scripts/migrate-import.mjs

import { getPublicClient, getAppClient, RESTAURANTS } from './lib/migrate-env.mjs'

const pub = getPublicClient()
const app = getAppClient()

const DAY_KEYS = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche']

function transformOpeningHours(old) {
  if (!old || typeof old !== 'object') return {}
  const out = {}
  for (const day of DAY_KEYS) {
    const d = old[day]
    if (!d || d.ferme) continue
    if (!d.ouverture || !d.fermeture) continue
    out[day] = `${d.ouverture}-${d.fermeture}`
  }
  return out
}

function transformRestaurant(old) {
  return {
    id: old.id,
    name: old.name,
    slug: old.slug,
    description: old.description,
    logo_url: old.logo_url,
    cover_url: old.cover_url,
    banner_url: old.banner_url,
    phone: old.phone,
    whatsapp_number: old.whatsapp_number || old.whatsapp_phone,
    address: old.address,
    city: old.city,
    cuisine_type: old.cuisine_type,
    is_active: old.is_active,
    is_verified: old.is_verified,
    is_demo: old.is_demo,
    owner_id: old.owner_id,
    latitude: old.latitude,
    longitude: old.longitude,
    opening_hours: transformOpeningHours(old.opening_hours),
    facebook_url: old.facebook_url,
    instagram_url: old.instagram_url,
    tiktok_url: old.tiktok_url,
    snapchat_url: old.snapchat_url,
    wave_number: old.wave_number,
    orange_money_number: old.orange_money_number,
    show_delivery_info: old.show_delivery_fee ?? false,
    delivery_info: old.delivery_fee > 0 ? `Livraison : ${old.delivery_fee} FCFA` : null,
    referral_code: old.referral_code,
    referred_by_code: old.referred_by_code,
    newsletter_opt_in: old.newsletter_opt_in ?? false,
    is_boosted: old.is_boosted ?? false,
    is_founder: old.is_founder ?? false,
    created_at: old.created_at,
    updated_at: old.updated_at,
  }
}

function transformProfile(old) {
  return {
    id: old.id,
    email: old.email,
    full_name: old.full_name,
    role: old.role,
    restaurant_id: old.restaurant_id,
    phone: old.phone_number || old.phone,
    created_at: old.created_at,
    updated_at: old.updated_at,
  }
}

function transformSubscription(old) {
  return {
    id: old.id,
    restaurant_id: old.restaurant_id,
    plan: old.plan,
    status: old.status,
    started_at: old.started_at,
    ends_at: old.ends_at,
    created_at: old.created_at,
    updated_at: old.updated_at,
  }
}

function transformMenuCategory(old) {
  return {
    id: old.id,
    restaurant_id: old.restaurant_id,
    name: old.name,
    position: old.position,
    is_active: old.is_active,
    created_at: old.created_at,
    updated_at: old.updated_at,
  }
}

function transformMenuItem(old) {
  return {
    id: old.id,
    restaurant_id: old.restaurant_id,
    category_id: old.category_id,
    name: old.name,
    description: old.description,
    price: old.price,
    image_url: old.image_url,
    images_urls: old.image_urls ?? [],
    is_available: old.is_available,
    track_stock: old.stock_enabled ?? false,
    stock_quantity: old.stock_quantity,
    position: old.position,
    created_at: old.created_at,
    updated_at: old.updated_at,
    discount_percent: old.discount_percent,
    preorder_enabled: old.preorder_enabled ?? false,
    preorder_start: old.preorder_open_at,
    preorder_end: old.preorder_close_at,
    preorder_delivery_date: old.preorder_delivery_date,
    preorder_max_qty: old.preorder_max_qty,
    preorder_current_qty: old.preorder_reserved ?? 0,
    is_featured: old.is_featured ?? false,
    badge_text: old.featured_label,
    is_pinned: old.is_pinned ?? false,
    video_url: old.video_url,
    // slug: généré par le trigger app.generate_menu_item_slug() à l'insertion.
  }
}

function transformVariantGroup(menuItemId, oldVariantRows) {
  const sorted = [...oldVariantRows].sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const options = sorted.map(v => v.name)
  const option_prices = {}
  for (const v of sorted) option_prices[v.name] = v.price
  return {
    menu_item_id: menuItemId,
    name: 'Options',
    options,
    option_prices,
    option_images: {},
    created_at: sorted[0]?.created_at,
  }
}

function transformPromoCode(old) {
  const discountType = old.discount_type || old.type
  return {
    id: old.id,
    restaurant_id: old.restaurant_id,
    code: old.code,
    discount_type: discountType === 'percentage' ? 'percent' : discountType,
    discount_value: old.value,
    min_order_amount: old.min_order_amount ?? old.min_order ?? 0,
    max_uses: old.max_uses,
    uses_count: old.uses_count ?? 0,
    is_active: old.is_active,
    expires_at: old.expires_at,
    created_at: old.created_at,
  }
}

// Le nouveau schéma n'a que pending/confirmed/in_delivery/delivered/cancelled
// (CHECK orders_status_check) — l'ancien avait aussi "delivery_cancelled".
const ORDER_STATUS_MAP = {
  delivery_cancelled: 'cancelled',
}

function transformOrder(old) {
  return {
    id: old.id,
    restaurant_id: old.restaurant_id,
    order_number: old.order_number,
    customer_name: old.customer_name,
    customer_phone: old.customer_phone,
    items: old.items ?? [],
    total: old.total,
    payment_method: old.payment_method,
    status: ORDER_STATUS_MAP[old.status] ?? old.status,
    notes: old.notes,
    created_at: old.created_at,
    updated_at: old.updated_at,
    customer_address: old.customer_address,
    discount_amount: old.discount_amount ?? 0,
    promo_code_id: old.promo_code_id,
  }
}

function transformReview(old) {
  return {
    id: old.id,
    restaurant_id: old.restaurant_id,
    order_id: old.order_id,
    customer_name: old.customer_name,
    rating: old.rating,
    comment: old.comment,
    is_visible: old.is_visible,
    created_at: old.created_at,
  }
}

async function upsert(table, rows, label) {
  if (!rows.length) {
    console.log(`  ${label}: 0 lignes, rien à faire`)
    return
  }
  const { error } = await app.from(table).upsert(rows, { onConflict: 'id' })
  if (error) throw new Error(`upsert ${table}: ${error.message}`)
  console.log(`  ${label}: ${rows.length} lignes upsertées`)
}

// ─── super_admin profiles (hors restaurant) ────────────────────────────────
console.log('\n=== Comptes super-admin ===')
const { data: superAdmins, error: saErr } = await pub.from('profiles').select('*').eq('role', 'super_admin')
if (saErr) throw new Error(saErr.message)
await upsert('profiles', (superAdmins ?? []).map(transformProfile), 'profiles (super_admin)')

// ─── par restaurant ─────────────────────────────────────────────────────────
for (const r of RESTAURANTS) {
  console.log(`\n=== ${r.name} (${r.id}) ===`)

  const { data: restaurantRow, error: restErr } = await pub.from('restaurants').select('*').eq('id', r.id).single()
  if (restErr) throw new Error(`restaurants/${r.id}: ${restErr.message}`)
  await upsert('restaurants', [transformRestaurant(restaurantRow)], 'restaurants')

  const { data: profiles } = await pub.from('profiles').select('*').eq('restaurant_id', r.id)
  await upsert('profiles', (profiles ?? []).map(transformProfile), 'profiles')

  const { data: subs } = await pub.from('subscriptions').select('*').eq('restaurant_id', r.id)
  await upsert('subscriptions', (subs ?? []).map(transformSubscription), 'subscriptions')

  const { data: categories } = await pub.from('menu_categories').select('*').eq('restaurant_id', r.id)
  await upsert('menu_categories', (categories ?? []).map(transformMenuCategory), 'menu_categories')

  const { data: items } = await pub.from('menu_items').select('*').eq('restaurant_id', r.id)
  await upsert('menu_items', (items ?? []).map(transformMenuItem), 'menu_items')

  const itemIds = (items ?? []).map(i => i.id)
  let variantGroups = []
  if (itemIds.length) {
    const { data: variants } = await pub.from('menu_item_variants').select('*').in('menu_item_id', itemIds)
    const byItem = new Map()
    for (const v of variants ?? []) {
      if (!byItem.has(v.menu_item_id)) byItem.set(v.menu_item_id, [])
      byItem.get(v.menu_item_id).push(v)
    }
    variantGroups = [...byItem.entries()].map(([menuItemId, rows]) => transformVariantGroup(menuItemId, rows))
  }
  if (itemIds.length) {
    // Idempotent : la forme (groupée) n'a pas d'id stable côté source, donc on
    // supprime les groupes existants pour ces plats avant de réinsérer — un
    // re-run reflète toujours fidèlement l'état actuel de public.*.
    await app.from('menu_item_variants').delete().in('menu_item_id', itemIds)
  }
  if (variantGroups.length) {
    const { error } = await app.from('menu_item_variants').insert(variantGroups)
    if (error) throw new Error(`menu_item_variants: ${error.message}`)
    console.log(`  menu_item_variants: ${variantGroups.length} groupes (re)insérés`)
  } else {
    console.log('  menu_item_variants: 0 groupes')
  }

  const { data: promos } = await pub.from('promo_codes').select('*').eq('restaurant_id', r.id)
  await upsert('promo_codes', (promos ?? []).map(transformPromoCode), 'promo_codes')

  const { data: orders } = await pub.from('orders').select('*').eq('restaurant_id', r.id)
  await upsert('orders', (orders ?? []).map(transformOrder), 'orders')

  const { data: reviews } = await pub.from('reviews').select('*').eq('restaurant_id', r.id)
  await upsert('reviews', (reviews ?? []).map(transformReview), 'reviews')
}

console.log('\nImport terminé.')
