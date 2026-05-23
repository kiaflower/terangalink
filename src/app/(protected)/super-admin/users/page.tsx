import { createClient } from '@/lib/supabase/server'
import { Badge } from '@/components/ui/Badge'
import Link from 'next/link'
import { UserPlus, Users } from 'lucide-react'
import { formatDate, getInitials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

export const metadata = { title: 'Utilisateurs' }

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: profiles } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Utilisateurs</h1>
          <p className="text-gray-500 text-sm mt-1">
            {profiles?.length ?? 0} compte(s) enregistré(s)
          </p>
        </div>
        <Link
          href="/dashboard/super-admin/create-admin"
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Créer admin
        </Link>
      </div>

      {!profiles?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Aucun utilisateur</h3>
        </div>
      ) : (
        <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-surface-200 bg-surface-100">
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Utilisateur
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Rôle
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Restaurant
                  </th>
                  <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Inscrit le
                  </th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p: Profile) => (
                  <tr key={p.id} className="border-b border-surface-200 hover:bg-surface-100 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-surface-300 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                          {getInitials(p.full_name || p.email)}
                        </div>
                        <div>
                          <p className="text-white text-sm font-medium">
                            {p.full_name || 'Sans nom'}
                          </p>
                          <p className="text-gray-600 text-xs truncate max-w-[200px]">{p.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Badge variant={p.role === 'super_admin' ? 'orange' : 'info'}>
                        {p.role === 'super_admin' ? 'Super Admin' : 'Admin'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <Badge variant={p.restaurant_id ? 'success' : 'warning'}>
                        {p.restaurant_id ? 'Assigné' : 'Non assigné'}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-gray-500 text-xs hidden lg:table-cell">
                      {formatDate(p.created_at)}
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
