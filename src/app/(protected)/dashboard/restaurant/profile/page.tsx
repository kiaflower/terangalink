import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Card } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

export const metadata = { title: 'Profil restaurant' }

export default async function RestaurantProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, restaurant:restaurants(id, name, slug, city, phone, address, cuisine_type, is_active, logo_url, banner_url, cover_url, primary_color, background_color, theme_mode)')
    .eq('id', user.id)
    .single()

  const restaurant = profile?.restaurant as Record<string, string | boolean | null> | null

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Profil</h1>
        <p className="text-gray-500 text-sm mt-1">Informations de votre restaurant et de votre compte</p>
      </div>

      <div className="space-y-6">
        <Card>
          <h2 className="text-gray-900 font-semibold mb-4">Mon compte</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange text-xl font-bold">
              {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-gray-900 font-semibold">{profile?.full_name || 'Sans nom'}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <Badge variant="info" className="mt-1">Restaurant Admin</Badge>
            </div>
          </div>
        </Card>

        {restaurant ? (
          <Card>
            <h2 className="text-gray-900 font-semibold mb-4">Mon restaurant</h2>
            <div className="space-y-3">
              {[
                ['Nom', String(restaurant.name || '—')],
                ['Slug', `/${String(restaurant.slug || '')}`],
                ['Ville', String(restaurant.city || '—')],
                ['Téléphone', String(restaurant.phone || '—')],
                ['Adresse', String(restaurant.address || '—')],
                ['Type', String(restaurant.cuisine_type || '—')],
                ['Logo URL', String(restaurant.logo_url || '—')],
                ['Bannière URL', String(restaurant.banner_url || restaurant.cover_url || '—')],
                ['Couleur primaire', String(restaurant.primary_color || '—')],
                ['Fond', String(restaurant.background_color || '—')],
                ['Mode thème', String(restaurant.theme_mode || '—')],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-gray-200 last:border-0 gap-4">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-gray-900 text-sm font-medium text-right break-all">{value}</span>
                </div>
              ))}
              <div className="flex justify-between items-center py-2">
                <span className="text-gray-500 text-sm">Statut</span>
                <Badge variant={restaurant.is_active ? 'success' : 'warning'}>
                  {restaurant.is_active ? 'Actif' : 'Inactif'}
                </Badge>
              </div>
            </div>
          </Card>
        ) : (
          <Card>
            <p className="text-gray-500 text-sm text-center py-4">Aucun restaurant lié à ce compte</p>
          </Card>
        )}
      </div>
    </div>
  )
}