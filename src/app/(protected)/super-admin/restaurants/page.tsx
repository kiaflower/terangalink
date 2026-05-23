import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { PlusCircle, Store } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Restaurant } from '@/lib/types'

export const metadata = { title: 'Restaurants' }

export default async function RestaurantsPage() {
  const supabase = await createClient()
  const { data: restaurants } = await supabase
    .from('restaurants')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurants</h1>
          <p className="text-gray-500 text-sm mt-1">
            {restaurants?.length ?? 0} restaurant(s) sur la plateforme
          </p>
        </div>
        <Link
          href="/dashboard/super-admin/create-restaurant"
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          Nouveau
        </Link>
      </div>

      {!restaurants?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Aucun restaurant</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">
            Commencez par créer votre premier restaurant et son administrateur.
          </p>
          <Link
            href="/dashboard/super-admin/create-restaurant"
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Créer le premier restaurant
          </Link>
        </div>
      ) : (
        <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Restaurant
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Ville
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Créé le
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Statut
                  </th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map((r: Restaurant) => (
                  <tr key={r.id} className="border-b border-surface-200 hover:bg-surface-100 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-bold text-sm flex-shrink-0">
                          {r.name.charAt(0)}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">{r.name}</p>
                          <p className="text-gray-600 text-xs">/{r.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-gray-400 text-sm hidden sm:table-cell">
                      {r.city || 'Dakar'}
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs hidden md:table-cell">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-5 py-4">
                      <Badge variant={r.is_active ? 'success' : 'warning'}>
                        {r.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
