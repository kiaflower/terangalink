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
    .select('*, restaurant:restaurants(*)')
    .eq('id', user.id)
    .single()

  const restaurant = profile?.restaurant

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profil</h1>
        <p className="text-gray-500 text-sm mt-1">Informations de votre restaurant et de votre compte</p>
      </div>

      <div className="space-y-6">
        {/* Admin profile */}
        <Card>
          <h2 className="text-white font-semibold mb-4">Mon compte</h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-14 h-14 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange text-xl font-bold">
              {(profile?.full_name || user.email || 'U').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-white font-semibold">{profile?.full_name || 'Sans nom'}</p>
              <p className="text-gray-500 text-sm">{user.email}</p>
              <Badge variant="info" className="mt-1">Restaurant Admin</Badge>
            </div>
          </div>
        </Card>

        {/* Restaurant details */}
        {restaurant ? (
          <Card>
            <h2 className="text-white font-semibold mb-4">Mon restaurant</h2>
            <div className="space-y-3">
              {[
                ['Nom', restaurant.name],
                ['Slug', `/${restaurant.slug}`],
                ['Ville', restaurant.city || '—'],
                ['Téléphone', restaurant.phone || '—'],
                ['Adresse', restaurant.address || '—'],
                ['Type', restaurant.cuisine_type || '—'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-center py-2 border-b border-surface-200 last:border-0">
                  <span className="text-gray-500 text-sm">{label}</span>
                  <span className="text-white text-sm font-medium">{value}</span>
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
            <p className="text-gray-500 text-sm text-center py-4">
              Aucun restaurant lié à ce compte
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}
