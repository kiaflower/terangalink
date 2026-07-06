import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import RestaurantPageClient from './RestaurantPageClient'
import {
  buildAutoDescription,
  buildTitle,
  buildKeywords,
  buildCanonical,
  buildOgImageUrl,
  buildSchemaOrg,
  buildBreadcrumbSchema,
  buildFaqEntries,
  buildFaqSchema,
  buildSeoContentBlock,
  SITE_NAME,
  SITE_URL,
} from '@/lib/seo'
import { slugifyToken } from '@/lib/slug'
import { getSimilarRestaurants, getRestaurantsInSameNeighborhood } from '@/lib/taxonomy'
import { isProPlan } from '@/lib/plans'
import { groupStoriesByRestaurant } from '@/lib/stories-utils'
import type { StoryWithRelations, RestaurantStoryGroup } from '@/lib/types'

interface Props { params: { slug: string } }

export const dynamic = 'force-dynamic'

const STATIC_EXTENSIONS = /\.(ico|png|jpg|jpeg|gif|svg|webp|txt|xml|json|js|css)$/i

interface RestaurantRow {
  id: string
  name: string
  slug: string
  description: string | null
  city: string | null
  neighborhood: string | null
  phone: string | null
  whatsapp_number: string | null
  address: string | null
  logo_url: string | null
  banner_url: string | null
  cover_url: string | null
  primary_color: string | null
  background_color: string | null
  theme_mode: string | null
  button_color: string | null
  facebook_url: string | null
  instagram_url: string | null
  tiktok_url: string | null
  snapchat_url: string | null
  opening_hours: Record<string, { ouverture?: string; fermeture?: string; ferme?: boolean }> | null
  is_active: boolean
  is_demo: boolean
  show_delivery_fee: boolean
  delivery_fee: number | null
  wave_number: string | null
  orange_money_number: string | null
  prep_time_minutes: number | null
  latitude: number | null
  longitude: number | null
  cuisine_type: string | null
  full_menu_image_url: string | null
  show_full_menu: boolean
  is_founder: boolean
  is_verified: boolean
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (STATIC_EXTENSIONS.test(params.slug)) {
    return { title: 'Not found', robots: { index: false } }
  }

  const supabase = await createClient()

  const { data } = await supabase
    .from('restaurants')
    .select('id, name, slug, description, city, address, cuisine_type, phone, whatsapp_number, logo_url, cover_url, latitude, longitude, opening_hours, facebook_url, instagram_url, tiktok_url, is_active')
    .eq('slug', params.slug)
    .single()

  if (!data || !data.is_active) {
    return { title: 'Restaurant introuvable', robots: { index: false, follow: false } }
  }

  // Colonne récente : tolère son absence tant que la migration n'est pas appliquée
  const { data: nbData } = await supabase.from('restaurants').select('neighborhood').eq('id', data.id).single()
  const neighborhood = (nbData as { neighborhood?: string | null } | null)?.neighborhood ?? null

  const [{ data: items }, { data: categories }] = await Promise.all([
    supabase.from('menu_items').select('name').eq('restaurant_id', data.id).eq('is_available', true).limit(10),
    supabase.from('menu_categories').select('name').eq('restaurant_id', data.id).eq('is_active', true).limit(10),
  ])

  const menuItemNames = (items ?? []).map((i: { name: string }) => i.name)
  const menuCategoryNames = (categories ?? []).map((c: { name: string }) => c.name)
  const topItems = menuItemNames.map(n => n.toLowerCase()).slice(0, 4)
  const topCategories = menuCategoryNames.map(n => n.toLowerCase()).slice(0, 4)
  const seoData = { ...data, neighborhood, topItems, topCategories, menuItemNames, menuCategoryNames }
  const description = data.description?.trim() ? data.description : buildAutoDescription(seoData)
  const title = buildTitle(seoData)
  const canonical = buildCanonical(params.slug)
  const ogImage = buildOgImageUrl(params.slug)
  const keywords = buildKeywords(seoData)

  return {
    title,
    description,
    keywords,
    alternates: { canonical },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-snippet': -1, 'max-image-preview': 'large', 'max-video-preview': -1 },
    },
    openGraph: {
      type: 'website',
      locale: 'fr_SN',
      url: canonical,
      siteName: SITE_NAME,
      title,
      description,
      images: [
        { url: ogImage, width: 1200, height: 630, alt: `${data.name} — commander en ligne` },
        ...(data.cover_url ? [{ url: data.cover_url, width: 1200, height: 630, alt: data.name }] : []),
        ...(data.logo_url ? [{ url: data.logo_url, width: 400, height: 400, alt: data.name }] : []),
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
      site: '@TerangaLink',
    },
    other: {
      ...(data.latitude && data.longitude ? {
        'geo.position': `${data.latitude};${data.longitude}`,
        'geo.placename': data.city ?? '',
        'geo.region': 'SN',
        ICBM: `${data.latitude}, ${data.longitude}`,
      } : {}),
    },
  }
}

export default async function RestaurantPage({ params }: Props) {
  if (STATIC_EXTENSIONS.test(params.slug)) notFound()

  const supabase = await createClient()

  const { data: baseData, error: baseError } = await supabase
    .from('restaurants')
    .select('id, name, slug, description, city, phone, address, logo_url, cover_url, is_active, cuisine_type')
    .eq('slug', params.slug)
    .single()

  if (baseError || !baseData) {
    console.error('Restaurant not found for slug:', params.slug, baseError)
    notFound()
  }

  const base = baseData as {
    id: string; name: string; slug: string; description: string | null
    city: string | null; phone: string | null; address: string | null
    logo_url: string | null; cover_url: string | null; is_active: boolean
    cuisine_type: string | null
  }

  if (!base.is_active) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <div className="text-5xl mb-4">🔒</div>
          <h1 className="text-xl font-bold text-white mb-2">Restaurant temporairement fermé</h1>
          <p className="text-gray-500 text-sm mb-6">Ce restaurant est momentanément indisponible.</p>
          <a href="/" className="text-brand-orange hover:underline text-sm">← Retour à TerangaLink</a>
        </div>
      </div>
    )
  }

  let extended: Partial<RestaurantRow> = {}
  try {
    const { data: extData } = await supabase
      .from('restaurants')
      .select('whatsapp_number, banner_url, primary_color, background_color, theme_mode, button_color, facebook_url, instagram_url, tiktok_url, snapchat_url, opening_hours, is_demo, show_delivery_fee, delivery_fee, wave_number, orange_money_number, prep_time_minutes, latitude, longitude, full_menu_image_url, show_full_menu')
      .eq('id', base.id)
      .single()
    if (extData) extended = extData as Partial<RestaurantRow>
  } catch {
    console.warn('Extended columns not yet available')
  }

  // Colonnes badges isolées de la requête ci-dessus : tolère leur absence
  // tant que la migration n'est pas appliquée, sans casser le thème/couleurs.
  try {
    const { data: badgeData } = await supabase
      .from('restaurants')
      .select('is_founder, is_verified')
      .eq('id', base.id)
      .single()
    if (badgeData) {
      extended.is_founder = (badgeData as { is_founder?: boolean }).is_founder ?? false
      extended.is_verified = (badgeData as { is_verified?: boolean }).is_verified ?? false
    }
  } catch {
    console.warn('is_founder/is_verified columns not yet available')
  }

  // Colonne récente isolée : tolère son absence tant que la migration n'est pas appliquée,
  // sans faire échouer la requête groupée des colonnes étendues ci-dessus.
  let neighborhood: string | null = null
  const { data: nbData } = await supabase.from('restaurants').select('neighborhood').eq('id', base.id).single()
  if (nbData) neighborhood = (nbData as { neighborhood: string | null }).neighborhood

  const adminClient = createAdminClient()
  const { data: subscriptionData, error: subscriptionError } = await adminClient
    .from('subscriptions')
    .select('plan, status')
    .eq('restaurant_id', base.id)
    .single()

  console.log('[DEBUG plan]', { restaurant_id: base.id, subscriptionData, subscriptionError })

  const subscription = subscriptionData as { plan: string; status: string } | null
  const isActiveSubscription = subscription?.status === 'active' || subscription?.status === 'trial'
  const plan = (subscription?.plan && isActiveSubscription) ? subscription.plan : 'starter'
  const isPremium = isProPlan(plan)

  console.log('[DEBUG plan resolved]', { plan, isPremium, isActiveSubscription })

  const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('restaurant_id', base.id).eq('is_active', true).order('position'),
    supabase.from('menu_items').select('*').eq('restaurant_id', base.id).order('position'),
  ])

  let variantsByItemId: Record<string, import('@/lib/types').MenuItemVariant[]> = {}
  if (isPremium && itemsData && itemsData.length > 0) {
    try {
      const itemIds = (itemsData as { id: string }[]).map(i => i.id)
      const { data: variantsData } = await supabase
        .from('menu_item_variants').select('*').in('menu_item_id', itemIds).order('position')
      if (variantsData) {
        for (const v of variantsData as import('@/lib/types').MenuItemVariant[]) {
          if (!variantsByItemId[v.menu_item_id]) variantsByItemId[v.menu_item_id] = []
          variantsByItemId[v.menu_item_id].push(v)
        }
      }
    } catch { console.warn('menu_item_variants table not yet available') }
  }

  const enrichedItems = (itemsData as import('@/lib/types').MenuItem[] ?? []).map(item => ({
    ...item,
    variants: variantsByItemId[item.id] ?? [],
  }))

  let banners: import('@/components/restaurant/PromoBanners').Banner[] = []
  if (isPremium) {
    try {
      const { data: bannersData } = await supabase
        .from('banners').select('*').eq('restaurant_id', base.id).eq('is_active', true).order('position')
      if (bannersData) banners = bannersData as import('@/components/restaurant/PromoBanners').Banner[]
    } catch { console.warn('banners table not yet available') }
  }

  // Stories actives de ce restaurant — table récente : tolère son absence
  // tant que la migration n'est pas appliquée.
  let storyGroups: RestaurantStoryGroup[] = []
  try {
    const { data: storyRows } = await adminClient
      .from('stories')
      .select('*, menu_item:menu_items(id, name, price, image_url)')
      .eq('restaurant_id', base.id)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: true })

    const storiesWithRestaurant: StoryWithRelations[] = (storyRows ?? []).map(row => ({
      ...row,
      restaurant: { id: base.id, name: base.name, slug: base.slug, logo_url: base.logo_url },
    })) as StoryWithRelations[]

    storyGroups = groupStoriesByRestaurant(storiesWithRestaurant)
  } catch {
    console.warn('stories table not yet available')
  }

  const restaurant: RestaurantRow = {
    ...base,
    neighborhood,
    whatsapp_number: extended.whatsapp_number ?? null,
    banner_url: extended.banner_url ?? base.cover_url ?? null,
    cover_url: extended.banner_url ?? base.cover_url ?? null,
    primary_color: extended.primary_color ?? null,
    background_color: extended.background_color ?? null,
    theme_mode: extended.theme_mode ?? 'dark',
    button_color: extended.button_color ?? null,
    facebook_url: extended.facebook_url ?? null,
    instagram_url: extended.instagram_url ?? null,
    tiktok_url: extended.tiktok_url ?? null,
    snapchat_url: extended.snapchat_url ?? null,
    opening_hours: (extended.opening_hours as RestaurantRow['opening_hours']) ?? null,
    is_demo: extended.is_demo ?? false,
    show_delivery_fee: extended.show_delivery_fee ?? false,
    delivery_fee: extended.delivery_fee ?? null,
    wave_number: extended.wave_number ?? null,
    orange_money_number: extended.orange_money_number ?? null,
    prep_time_minutes: extended.prep_time_minutes ?? null,
    latitude: extended.latitude ?? null,
    longitude: extended.longitude ?? null,
    full_menu_image_url: extended.full_menu_image_url ?? null,
    show_full_menu: extended.show_full_menu ?? false,
    is_founder: extended.is_founder ?? false,
    is_verified: extended.is_verified ?? false,
  }

  const seoData = {
    name: restaurant.name,
    slug: restaurant.slug,
    description: restaurant.description,
    city: restaurant.city,
    neighborhood: restaurant.neighborhood,
    address: restaurant.address,
    cuisine_type: restaurant.cuisine_type,
    phone: restaurant.phone,
    whatsapp_number: restaurant.whatsapp_number,
    logo_url: restaurant.logo_url,
    cover_url: restaurant.cover_url,
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
    opening_hours: restaurant.opening_hours,
    facebook_url: restaurant.facebook_url,
    instagram_url: restaurant.instagram_url,
    tiktok_url: restaurant.tiktok_url,
    topItems: enrichedItems.filter(i => i.is_available).slice(0, 5).map(i => i.name.toLowerCase()),
    topCategories: (categoriesData as Array<{ name: string }> ?? []).map(c => c.name.toLowerCase()),
    // Menu enrichi pour hasMenu Schema.org
    menuCategories: (categoriesData as Array<{ id: string; name: string }> ?? []).map(c => ({ id: c.id, name: c.name })),
    menuItems: enrichedItems.map(i => ({
      name: i.name,
      description: i.description,
      price: i.price,
      category_id: i.category_id,
      is_available: i.is_available,
    })),
  }

  const schemaOrg = buildSchemaOrg(seoData)
  const faqEntries = buildFaqEntries(seoData)
  const faqSchema = buildFaqSchema(faqEntries)
  const seoContent = buildSeoContentBlock(seoData)

  const citySlug = restaurant.city ? slugifyToken(restaurant.city) : null
  const cuisineSlug = restaurant.cuisine_type ? slugifyToken(restaurant.cuisine_type) : null
  const canonicalUrl = buildCanonical(restaurant.slug)

  const breadcrumbItems: { label: string; href?: string }[] = [
    { label: 'Accueil', href: '/' },
    { label: 'Restaurants', href: '/restaurants' },
  ]
  if (restaurant.city && citySlug) {
    breadcrumbItems.push({ label: restaurant.city, href: `/restaurants/${citySlug}` })
  }
  if (restaurant.cuisine_type && citySlug && cuisineSlug) {
    breadcrumbItems.push({ label: restaurant.cuisine_type, href: `/restaurants/${citySlug}/${cuisineSlug}` })
  }
  const breadcrumbSchema = buildBreadcrumbSchema([
    ...breadcrumbItems.map(b => ({ name: b.label, url: `${SITE_URL}${b.href}` })),
    { name: restaurant.name, url: canonicalUrl },
  ])

  const similarRestaurants = await getSimilarRestaurants({
    id: base.id,
    city: restaurant.city,
    neighborhood: restaurant.neighborhood,
    cuisine_type: restaurant.cuisine_type,
  }, 8)

  const neighborhoodRestaurants = await getRestaurantsInSameNeighborhood({
    id: base.id,
    city: restaurant.city,
    neighborhood: restaurant.neighborhood,
  }, 8)

  return (
    <>
      <script
        id="schema-restaurant"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schemaOrg) }}
      />
      <script
        id="schema-breadcrumb"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
      {faqSchema && (
        <script
          id="schema-faq"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <RestaurantPageClient
        data={{
          restaurant: { ...restaurant, plan, banners },
          categories: (categoriesData as never[]) ?? [],
          items: enrichedItems,
        }}
        breadcrumbItems={breadcrumbItems}
        similarRestaurants={similarRestaurants}
        neighborhoodRestaurants={neighborhoodRestaurants}
        seoContent={seoContent}
        stories={storyGroups}
      />
    </>
  )
}