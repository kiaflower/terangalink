import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metadata } from 'next'
import RestaurantPageClient from './RestaurantPageClient'

interface Props { params: { slug: string } }

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('restaurants')
    .select('name, description')
    .eq('slug', params.slug)
    .single()

  if (!data) return { title: 'Restaurant introuvable' }

  return {
    title: `${data.name} — Commander en ligne`,
    description: data.description || `Commandez chez ${data.name} via WhatsApp`,
  }
}

export default async function RestaurantPage({ params }: Props) {
  const supabase = await createClient()

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, name, slug, description, city, phone, whatsapp_number, address, logo_url, banner_url, cover_url, primary_color, background_color, theme_mode, opening_hours, is_active, is_demo, show_delivery_fee, delivery_fee, wave_number, orange_money_number, prep_time_minutes')
    .eq('slug', params.slug)
    .single()

  if (!restaurant) notFound()

  if (!restaurant.is_active) {
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

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('restaurant_id', restaurant.id)
    .single()

  const [{ data: categories }, { data: items }] = await Promise.all([
    supabase.from('menu_categories').select('*').eq('restaurant_id', restaurant.id).eq('is_active', true).order('position'),
    supabase.from('menu_items').select('*').eq('restaurant_id', restaurant.id).order('position'),
  ])

  return (
    <RestaurantPageClient
      data={{
        restaurant: {
          ...restaurant,
          banner_url: restaurant.banner_url || restaurant.cover_url || null,
          cover_url: restaurant.banner_url || restaurant.cover_url || null,
          plan: subscription?.plan ?? null,
        },
        categories: categories ?? [],
        items: items ?? [],
      }}
    />
  )
}