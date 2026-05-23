'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import Link from 'next/link'
import { PlusCircle, Store, Pencil, Trash2, AlertTriangle, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { PLAN_LABELS, normalizePlan } from '@/lib/plans'

interface Restaurant {
  id: string; name: string; slug: string; city: string | null
  phone: string | null; whatsapp_number: string | null
  is_active: boolean; created_at: string
}
interface AdminProfile { id: string; email: string; full_name: string | null; restaurant_id: string | null }
interface Subscription { restaurant_id: string; plan: string; status: string }

export default function RestaurantsPage() {
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [adminsByRestaurant, setAdminsByRestaurant] = useState<Record<string, AdminProfile[]>>({})
  const [subByRestaurant, setSubByRestaurant] = useState<Record<string, Subscription>>({})
  const [loading, setLoading] = useState(true)

  // Delete modal state
  const [deleteModal, setDeleteModal] = useState(false)
  const [toDelete, setToDelete] = useState<Restaurant | null>(null)
  const [deleteAdmins, setDeleteAdmins] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  const loadData = useCallback(async () => {
    const [{ data: rests }, { data: admins }, { data: subs }] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name, restaurant_id').eq('role', 'restaurant_admin').not('restaurant_id', 'is', null),
      supabase.from('subscriptions').select('restaurant_id, plan, status'),
    ])

    setRestaurants(rests ?? [])

    const aMap: Record<string, AdminProfile[]> = {}
    for (const a of admins ?? []) {
      if (!a.restaurant_id) continue
      if (!aMap[a.restaurant_id]) aMap[a.restaurant_id] = []
      aMap[a.restaurant_id].push(a)
    }
    setAdminsByRestaurant(aMap)

    const sMap: Record<string, Subscription> = {}
    for (const s of subs ?? []) sMap[s.restaurant_id] = s
    setSubByRestaurant(sMap)

    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  function openDelete(r: Restaurant) {
    setToDelete(r)
    setDeleteAdmins(false)
    setDeleteError(null)
    setDeleteModal(true)
  }

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    setDeleteError(null)

    const res = await fetch('/api/admin/delete-restaurant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: toDelete.id, delete_admins: deleteAdmins }),
    })
    const data = await res.json()
    setDeleting(false)

    if (!res.ok) {
      setDeleteError(data.error || 'Erreur lors de la suppression')
      return
    }

    setRestaurants(prev => prev.filter(r => r.id !== toDelete.id))
    setDeleteModal(false)
    setToDelete(null)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Restaurants</h1>
          <p className="text-gray-500 text-sm mt-1">
            {restaurants.length} restaurant(s) — gérez les admins depuis la page Modifier
          </p>
        </div>
        <Link
          href="/dashboard/super-admin/restaurants/new"
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <PlusCircle className="w-4 h-4" />Nouveau restaurant
        </Link>
      </div>

      {restaurants.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-gray-600" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Aucun restaurant</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">Créez votre premier restaurant pour commencer.</p>
          <Link href="/dashboard/super-admin/restaurants/new" className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors">
            <PlusCircle className="w-4 h-4" />Créer le premier restaurant
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {restaurants.map((r) => {
            const admins = adminsByRestaurant[r.id] ?? []
            const sub = subByRestaurant[r.id]
            const planLabel = sub ? PLAN_LABELS[normalizePlan(sub.plan)] : null

            return (
              <div key={r.id} className="bg-surface-50 border border-surface-200 hover:border-surface-300 rounded-2xl p-5 transition-all">
                <div className="flex items-start gap-4 flex-wrap">
                  {/* Initial */}
                  <div className="w-12 h-12 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-black text-xl flex-shrink-0">
                    {r.name.charAt(0)}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-white font-semibold">{r.name}</p>
                      <Badge variant={r.is_active ? 'success' : 'warning'}>
                        {r.is_active ? 'Actif' : 'Suspendu'}
                      </Badge>
                      {planLabel && (
                        <Badge variant={sub?.status === 'active' ? 'info' : 'warning'}>
                          {planLabel}
                        </Badge>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                      <span>/{r.slug}</span>
                      {r.city && <span>📍 {r.city}</span>}
                      {r.phone && <span>📞 {r.phone}</span>}
                      {r.whatsapp_number && <span>💬 {r.whatsapp_number}</span>}
                      <span>Créé le {formatDate(r.created_at)}</span>
                    </div>

                    {/* Admins chips */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs text-gray-600">Admins :</span>
                      {admins.length === 0 ? (
                        <span className="text-xs text-yellow-400">Aucun admin — ajoutez-en depuis Modifier</span>
                      ) : (
                        admins.map(a => (
                          <div key={a.id} className="flex items-center gap-1.5 bg-surface-200 rounded-full px-2.5 py-1">
                            <div className="w-4 h-4 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange text-xs font-bold">
                              {(a.full_name || a.email).charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-300 text-xs truncate max-w-[140px]">
                              {a.full_name || a.email}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 flex-wrap">
                    <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer"
                      className="text-gray-500 hover:text-brand-orange text-xs transition-colors px-2 py-1">
                      Voir →
                    </a>
                    <Link href={`/dashboard/super-admin/edit-restaurant/${r.id}`}
                      className="inline-flex items-center gap-1.5 bg-surface-200 hover:bg-surface-300 text-gray-300 hover:text-white px-3 py-2 rounded-xl text-xs font-semibold transition-colors">
                      <Pencil className="w-3 h-3" />Modifier
                    </Link>
                    <button onClick={() => openDelete(r)}
                      className="inline-flex items-center gap-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-3 py-2 rounded-xl text-xs font-semibold transition-colors border border-red-500/20">
                      <Trash2 className="w-3 h-3" />Supprimer
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Supprimer le restaurant" size="sm">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Action irréversible</p>
              <p className="text-red-300/70 text-xs mt-1">
                Supprimer <span className="font-semibold text-red-300">{toDelete?.name}</span> effacera
                définitivement le restaurant, son menu, ses catégories et ses analytics.
              </p>
            </div>
          </div>

          {deleteError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {deleteError}
            </div>
          )}

          {/* Admin handling option */}
          {(adminsByRestaurant[toDelete?.id ?? ''] ?? []).length > 0 && (
            <div className="bg-surface-100 rounded-xl p-4 space-y-2">
              <p className="text-white text-sm font-semibold">
                {(adminsByRestaurant[toDelete?.id ?? ''] ?? []).length} admin(s) lié(s) à ce restaurant
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteAdmins}
                  onChange={e => setDeleteAdmins(e.target.checked)}
                  className="w-4 h-4 accent-red-500 mt-0.5"
                />
                <div>
                  <p className="text-gray-300 text-sm">Supprimer aussi leurs comptes</p>
                  <p className="text-gray-500 text-xs mt-0.5">
                    Si décoché, les comptes sont conservés mais délié du restaurant.
                  </p>
                </div>
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => setDeleteModal(false)}
              className="flex-1 bg-surface-100 hover:bg-surface-200 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Suppression...' : 'Supprimer définitivement'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
