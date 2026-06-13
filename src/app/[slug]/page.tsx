import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import RestaurantPageClient from './RestaurantPageClient'

interface Props { params: { slug: string } }

export const dynamic = 'force-dynamic'

interface RestaurantRow {
  id: string
  name: string
  slug: string
  description: string | null
  city: string | null
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
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  const row = data as { name: string; description: string | null } | null
  if (!row) return { title: 'Restaurant introuvable' }

  return {
    title: `${row.name} — Commander en ligne`,
    description: row.description || `Commandez chez ${row.name} via WhatsApp`,
  }
}

export default async function RestaurantPage({ params }: Props) {
  const supabase = await createClient()

  // Sélection des colonnes de base garanties présentes en base
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

  // Sélection des colonnes étendues (ajoutées via migration) — on gère l'absence gracieusement
  let extended: Partial<RestaurantRow> = {}
  try {
    const { data: extData } = await supabase
      .from('restaurants')
      .select('whatsapp_number, banner_url, primary_color, background_color, theme_mode, button_color, facebook_url, instagram_url, tiktok_url, opening_hours, is_demo, show_delivery_fee, delivery_fee, wave_number, orange_money_number, prep_time_minutes, latitude, longitude')
      .eq('id', base.id)
      .single()

    if (extData) {
      extended = extData as Partial<RestaurantRow>
    }
  } catch {
    // Les colonnes étendues n'existent pas encore — on continue avec les valeurs par défaut
    console.warn('Extended columns not yet available — run migration SQL')
  }

  // Récupération du plan d'abonnement
  const { data: subscriptionData } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('restaurant_id', base.id)
    .single()

  const subscription = subscriptionData as { plan: string; status: string } | null
  const plan = subscription?.plan ?? 'starter'

  const [{ data: categoriesData }, { data: itemsData }] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('restaurant_id', base.id).eq('is_active', true).order('position'),
    supabase.from('menu_items').select('*').eq('restaurant_id', base.id).order('position'),
  ])

  const restaurant: RestaurantRow = {
    ...base,
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
    opening_hours: (extended.opening_hours as RestaurantRow['opening_hours']) ?? null,
    is_demo: extended.is_demo ?? false,
    show_delivery_fee: extended.show_delivery_fee ?? false,
    delivery_fee: extended.delivery_fee ?? null,
    wave_number: extended.wave_number ?? null,
    orange_money_number: extended.orange_money_number ?? null,
    prep_time_minutes: extended.prep_time_minutes ?? null,
    latitude: extended.latitude ?? null,
    longitude: extended.longitude ?? null,
  }

  return (
    <RestaurantPageClient
      data={{
        restaurant: { ...restaurant, plan },
        categories: (categoriesData as never[]) ?? [],
        items: (itemsData as never[]) ?? [],
      }}
    />
  )
}
