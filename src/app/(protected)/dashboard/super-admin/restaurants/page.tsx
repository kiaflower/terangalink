'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/Badge'
import { Modal } from '@/components/ui/Modal'
import Link from 'next/link'
import { PlusCircle, Store, Pencil, Trash2, AlertTriangle, Loader2, RotateCcw, Clock, CheckCircle, XCircle, PauseCircle, Zap, ExternalLink } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { formatDate } from '@/lib/utils'
import { PLAN_LABELS, normalizePlan } from '@/lib/plans'

type SubStatus = 'trial' | 'active' | 'overdue' | 'suspended' | 'cancelled'

interface Restaurant {
  id: string; name: string; slug: string; city: string | null
  phone: string | null; whatsapp_number: string | null
  is_active: boolean; is_boosted: boolean; created_at: string
  logo_url: string | null
}
interface AdminProfile { id: string; email: string; full_name: string | null; restaurant_id: string | null }
interface Subscription {
  restaurant_id: string; plan: string; status: SubStatus
  trial_end_date: string | null; next_payment_due_date: string | null
}

const STATUS_CONFIG: Record<SubStatus, { label: string; color: string; icon: React.ReactNode }> = {
  trial:     { label: 'Essai',     color: 'text-blue-400',   icon: <Clock className="w-3 h-3" /> },
  active:    { label: 'Actif',     color: 'text-green-400',  icon: <CheckCircle className="w-3 h-3" /> },
  overdue:   { label: 'En retard', color: 'text-red-400',    icon: <AlertTriangle className="w-3 h-3" /> },
  suspended: { label: 'Suspendu',  color: 'text-orange-400', icon: <PauseCircle className="w-3 h-3" /> },
  cancelled: { label: 'Annulé',   color: 'text-gray-500',   icon: <XCircle className="w-3 h-3" /> },
}

function getDaysLabel(sub: Subscription): { label: string; color: string } | null {
  const date = sub.status === 'trial' ? sub.trial_end_date : sub.next_payment_due_date
  if (!date) return null
  const diff = Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (diff < 0) return { label: `En retard de ${Math.abs(diff)}j`, color: 'text-red-400' }
  if (diff === 0) return { label: 'Échéance aujourd\'hui', color: 'text-orange-400' }
  if (diff <= 3) return { label: `J-${diff}`, color: 'text-orange-400' }
  if (diff <= 7) return { label: `J-${diff}`, color: 'text-yellow-400' }
  return null
}

export default function RestaurantsPage() {
  const supabase = createClient()
  const router = useRouter()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [adminsByRestaurant, setAdminsByRestaurant] = useState<Record<string, AdminProfile[]>>({})
  const [subByRestaurant, setSubByRestaurant] = useState<Record<string, Subscription>>({})
  const [loading, setLoading] = useState(true)

  const [statusFilter, setStatusFilter] = useState<'all' | SubStatus>('all')
  const [planFilter, setPlanFilter] = useState<'all' | 'starter' | 'pro'>('all')
  const [sortBy, setSortBy] = useState<'created_at' | 'due_date'>('created_at')

  const [deleteModal, setDeleteModal] = useState(false)
  const [toDelete, setToDelete] = useState<Restaurant | null>(null)
  const [deleteAdmins, setDeleteAdmins] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [resettingId, setResettingId] = useState<string | null>(null)
  const [boostingId, setBoostingId] = useState<string | null>(null)
  const [impersonatingId, setImpersonatingId] = useState<string | null>(null)

  async function handleImpersonate(r: Restaurant) {
    setImpersonatingId(r.id)
    const res = await fetch('/api/super-admin/impersonate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: r.id }),
    })
    if (res.ok) {
      window.location.href = '/dashboard/restaurant'
    }
    setImpersonatingId(null)
  }

  const loadData = useCallback(async () => {
    const [{ data: rests }, { data: admins }, { data: subs }] = await Promise.all([
      supabase.from('restaurants').select('*').order('created_at', { ascending: false }),
      supabase.from('profiles').select('id, email, full_name, restaurant_id').eq('role', 'restaurant_admin').not('restaurant_id', 'is', null),
      supabase.from('subscriptions').select('restaurant_id, plan, status, trial_end_date, next_payment_due_date'),
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
    for (const s of subs ?? []) sMap[s.restaurant_id] = s as Subscription
    setSubByRestaurant(sMap)

    setLoading(false)
  }, [supabase])

  useEffect(() => {
    loadData()
    // Pas de cron sur ce projet : on recalcule l'éligibilité au badge Vérifié
    // à chaque visite de cette page, puis on recharge pour refléter les changements.
    fetch('/api/admin/refresh-verified-badges', { method: 'POST' }).then(() => loadData())
  }, [loadData])

  function openDelete(r: Restaurant) {
    setToDelete(r)
    setDeleteAdmins(false)
    setDeleteError(null)
    setDeleteModal(true)
  }

  async function toggleBoost(restaurant: Restaurant) {
    setBoostingId(restaurant.id)
    await supabase
      .from('restaurants')
      .update({ is_boosted: !restaurant.is_boosted })
      .eq('id', restaurant.id)
    setRestaurants(prev => prev.map(r => r.id === restaurant.id ? { ...r, is_boosted: !r.is_boosted } : r))
    setBoostingId(null)
  }

  async function resetAnalytics(restaurant: Restaurant) {
    if (!confirm(`⚠️ Réinitialiser les stats de ${restaurant.name} ?\n\nCela supprimera définitivement :\n• Toutes les commandes\n• Tous les événements analytiques (vues, visites…)\n\nCette action est irréversible.`)) return
    setResettingId(restaurant.id)
    const res = await fetch('/api/admin/reset-restaurant-analytics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurant.id }),
    })
    const data = await res.json()
    setResettingId(null)
    if (!res.ok) { alert(data.error || 'Erreur lors de la réinitialisation'); return }
    alert(`✓ Stats de ${restaurant.name} réinitialisées. Commandes et analytics supprimés.`)
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
    if (!res.ok) { setDeleteError(data.error || 'Erreur lors de la suppression'); return }
    setRestaurants(prev => prev.filter(r => r.id !== toDelete.id))
    setDeleteModal(false)
    setToDelete(null)
  }

  // Filtrage + tri
  let filtered = restaurants.filter(r => {
    const sub = subByRestaurant[r.id]
    if (statusFilter !== 'all' && sub?.status !== statusFilter) return false
    if (planFilter !== 'all' && normalizePlan(sub?.plan ?? 'starter') !== planFilter) return false
    return true
  })

  if (sortBy === 'due_date') {
    filtered = [...filtered].sort((a, b) => {
      const sa = subByRestaurant[a.id]
      const sb = subByRestaurant[b.id]
      const da = sa?.next_payment_due_date || sa?.trial_end_date || '9999'
      const db = sb?.next_payment_due_date || sb?.trial_end_date || '9999'
      return da.localeCompare(db)
    })
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
    </div>
  )

  return (
    <div className="p-4 sm:p-8 max-w-7xl">
      <div className="flex items-start justify-between mb-5 gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Restaurants</h1>
          <p className="text-gray-500 text-xs sm:text-sm mt-0.5 truncate">
            {restaurants.length} restaurant(s)
          </p>
        </div>
        <Link
          href="/dashboard/super-admin/restaurants/new"
          className="inline-flex items-center gap-1.5 bg-brand-orange hover:bg-brand-orange-dark text-white px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-colors flex-shrink-0"
        >
          <PlusCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Nouveau restaurant</span>
          <span className="sm:hidden">Nouveau</span>
        </Link>
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap gap-1.5 mb-4 overflow-x-auto pb-1">
        {(['all', 'trial', 'active', 'overdue', 'suspended', 'cancelled'] as const).map(f => (
          <button
            key={f}
            onClick={() => setStatusFilter(f)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
              statusFilter === f
                ? 'bg-brand-orange text-white border-brand-orange'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-900'
            }`}
          >
            {f === 'all' ? 'Tous' : STATUS_CONFIG[f as SubStatus].label}
          </button>
        ))}
        <div className="w-px bg-gray-200 mx-0.5" />
        {(['all', 'starter', 'pro'] as const).map(p => (
          <button
            key={p}
            onClick={() => setPlanFilter(p)}
            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-all border whitespace-nowrap ${
              planFilter === p
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-gray-100 text-gray-500 border-gray-200 hover:text-gray-900'
            }`}
          >
            {p === 'all' ? 'Tous plans' : p === 'pro' ? 'Pro' : 'Starter'}
          </button>
        ))}
        <select
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'created_at' | 'due_date')}
          className="bg-gray-100 border border-gray-200 text-gray-500 text-xs rounded-full px-2.5 py-1 outline-none"
        >
          <option value="created_at">↓ Inscription</option>
          <option value="due_date">↓ Échéance</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
            <Store className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-gray-900 font-semibold text-lg mb-2">Aucun restaurant</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-sm">Aucun restaurant ne correspond à ce filtre.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => {
            const admins = adminsByRestaurant[r.id] ?? []
            const sub = subByRestaurant[r.id]
            const planLabel = sub ? PLAN_LABELS[normalizePlan(sub.plan)] : null
            const subCfg = sub ? STATUS_CONFIG[sub.status] : null
            const daysInfo = sub ? getDaysLabel(sub) : null

            return (
              <div key={r.id} className="bg-gray-50 border border-gray-200 hover:border-gray-300 rounded-2xl p-4 transition-all">
                <div className="flex items-start gap-3">
                  {/* Logo ou initiale */}
                  {r.logo_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={r.logo_url} alt={r.name} className="w-11 h-11 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-11 h-11 bg-brand-orange/10 rounded-xl flex items-center justify-center text-brand-orange font-black text-lg flex-shrink-0">
                      {r.name.charAt(0)}
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    {/* Nom + badges */}
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <p className="text-gray-900 font-semibold text-sm truncate">{r.name}</p>
                      <Badge variant={r.is_active ? 'success' : 'warning'}>
                        {r.is_active ? 'En ligne' : 'Hors ligne'}
                      </Badge>
                      {planLabel && (
                        <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold border ${normalizePlan(sub?.plan ?? '') === 'pro' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' : 'bg-gray-200 text-gray-500 border-gray-300'}`}>
                          {planLabel}
                        </span>
                      )}
                      {subCfg && (
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${subCfg.color}`}>
                          {subCfg.icon}{subCfg.label}
                        </span>
                      )}
                      {daysInfo && (
                        <span className={`text-xs font-bold ${daysInfo.color}`}>{daysInfo.label}</span>
                      )}
                    </div>

                    {/* Infos secondaires */}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mb-2">
                      <span>/{r.slug}</span>
                      {r.city && <span>📍 {r.city}</span>}
                      <span>Inscrit le {formatDate(r.created_at)}</span>
                      {sub?.trial_end_date && sub.status === 'trial' && (
                        <span>Essai → {formatDate(sub.trial_end_date)}</span>
                      )}
                      {sub?.next_payment_due_date && (
                        <span>Éch. {formatDate(sub.next_payment_due_date)}</span>
                      )}
                    </div>

                    {/* Admins */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {admins.length === 0 ? (
                        <span className="text-xs text-yellow-400">Aucun admin</span>
                      ) : (
                        admins.map(a => (
                          <div key={a.id} className="flex items-center gap-1 bg-orange-50 rounded-full px-2 py-0.5">
                            <div className="w-3.5 h-3.5 bg-brand-orange/20 rounded-full flex items-center justify-center text-brand-orange text-xs font-bold">
                              {(a.full_name || a.email).charAt(0).toUpperCase()}
                            </div>
                            <span className="text-gray-500 text-xs truncate max-w-[100px] sm:max-w-[160px]">
                              {a.full_name || a.email}
                            </span>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Boutons actions */}
                    <div className="flex items-center gap-1.5 mt-3 flex-wrap">
                      <a href={`/${r.slug}`} target="_blank" rel="noopener noreferrer"
                        title="Voir le site"
                        className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-brand-orange transition-colors text-xs font-bold">
                        →
                      </a>
                      <button
                        onClick={() => handleImpersonate(r)}
                        disabled={impersonatingId === r.id}
                        title="Accéder au dashboard"
                        className="inline-flex items-center gap-1 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border border-orange-500/20 disabled:opacity-60"
                      >
                        {impersonatingId === r.id
                          ? <Loader2 className="w-3 h-3 animate-spin" />
                          : <ExternalLink className="w-3 h-3" />}
                        <span className="hidden sm:inline">Dashboard</span>
                      </button>
                      <Link href={`/dashboard/super-admin/edit-restaurant/${r.id}`}
                        title="Modifier"
                        className="inline-flex items-center gap-1 bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-900 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors">
                        <Pencil className="w-3 h-3" />
                        <span className="hidden sm:inline">Modifier</span>
                      </Link>
                      <button
                        onClick={() => toggleBoost(r)}
                        disabled={boostingId === r.id}
                        title={r.is_boosted ? 'Retirer le boost' : 'Booster'}
                        className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border ${r.is_boosted ? 'bg-orange-500/20 text-orange-300 border-orange-500/30 hover:bg-orange-500/30' : 'bg-gray-200 text-gray-500 border-gray-300 hover:text-orange-300'}`}
                      >
                        {boostingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className={`w-3 h-3 ${r.is_boosted ? 'fill-orange-400' : ''}`} />}
                        <span className="hidden sm:inline">{r.is_boosted ? 'Boosté' : 'Booster'}</span>
                      </button>
                      <button
                        onClick={() => resetAnalytics(r)}
                        disabled={resettingId === r.id}
                        title="Réinitialiser les stats"
                        className="inline-flex items-center gap-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border border-amber-500/20 disabled:opacity-60"
                      >
                        {resettingId === r.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <RotateCcw className="w-3 h-3" />}
                        <span className="hidden sm:inline">Stats</span>
                      </button>
                      <button onClick={() => openDelete(r)}
                        title="Supprimer"
                        className="inline-flex items-center gap-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-colors border border-red-500/20">
                        <Trash2 className="w-3 h-3" />
                        <span className="hidden sm:inline">Supprimer</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Supprimer le restaurant" size="sm">
        <div className="space-y-4">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-red-400 font-semibold text-sm">Action irréversible</p>
              <p className="text-red-300/70 text-xs mt-1">
                Supprimer <span className="font-semibold text-red-300">{toDelete?.name}</span> effacera définitivement le restaurant, son menu et ses analytics.
              </p>
            </div>
          </div>
          {deleteError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{deleteError}</div>
          )}
          {(adminsByRestaurant[toDelete?.id ?? ''] ?? []).length > 0 && (
            <div className="bg-gray-100 rounded-xl p-4 space-y-2">
              <p className="text-gray-900 text-sm font-semibold">
                {(adminsByRestaurant[toDelete?.id ?? ''] ?? []).length} admin(s) lié(s)
              </p>
              <label className="flex items-start gap-3 cursor-pointer">
                <input type="checkbox" checked={deleteAdmins} onChange={e => setDeleteAdmins(e.target.checked)} className="w-4 h-4 accent-red-500 mt-0.5" />
                <div>
                  <p className="text-gray-500 text-sm">Supprimer aussi leurs comptes</p>
                  <p className="text-gray-500 text-xs mt-0.5">Si décoché, les comptes sont conservés mais déliés.</p>
                </div>
              </label>
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button onClick={() => setDeleteModal(false)} className="flex-1 bg-gray-100 hover:bg-gray-100 text-gray-900 py-2.5 rounded-xl text-sm font-semibold transition-colors">Annuler</button>
            <button onClick={confirmDelete} disabled={deleting} className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              {deleting ? 'Suppression...' : 'Supprimer'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
