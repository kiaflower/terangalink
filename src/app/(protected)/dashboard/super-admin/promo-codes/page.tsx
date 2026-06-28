'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { PlusCircle, Tag, Trash2, Loader2, Percent, DollarSign, ToggleLeft, ToggleRight, BarChart3 } from 'lucide-react'

interface PromoCode {
  id: string
  restaurant_id: string | null
  code: string
  discount_type: 'fixed' | 'percent'
  value: number
  min_order_amount: number | null
  expires_at: string | null
  max_uses: number | null
  current_uses: number
  is_active: boolean
  created_at: string
}

interface Restaurant {
  id: string
  name: string
}

interface PromoForm {
  code: string
  discount_type: 'fixed' | 'percent'
  value: string
  min_order_amount: string
  expires_at: string
  max_uses: string
  restaurant_id: string
  is_active: boolean
}

const EMPTY_FORM: PromoForm = {
  code: '',
  discount_type: 'percent',
  value: '',
  min_order_amount: '',
  expires_at: '',
  max_uses: '',
  restaurant_id: '',
  is_active: true,
}

export default function SuperAdminPromoCodesPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [statsCode, setStatsCode] = useState<PromoCode | null>(null)
  const [stats, setStats] = useState<{ count: number; totalDiscount: number } | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const loadData = useCallback(async () => {
    const [{ data: promos }, { data: restos }] = await Promise.all([
      supabase.from('promo_codes').select('*').order('created_at', { ascending: false }),
      supabase.from('restaurants').select('id, name').eq('is_active', true).order('name'),
    ])
    setCodes(promos ?? [])
    setRestaurants(restos ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  async function openStats(code: PromoCode) {
    setStatsCode(code)
    setStats(null)
    setStatsLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('promo_discount')
      .eq('promo_code_id', code.id)
    if (data) {
      const count = data.length
      const totalDiscount = data.reduce((sum, o) => sum + (o.promo_discount ?? 0), 0)
      setStats({ count, totalDiscount })
    }
    setStatsLoading(false)
  }

  async function toggleActive(code: PromoCode) {
    setTogglingId(code.id)
    await supabase.from('promo_codes').update({ is_active: !code.is_active }).eq('id', code.id)
    setCodes(prev => prev.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c))
    setTogglingId(null)
  }

  async function deleteCode(id: string) {
    if (!confirm('Supprimer ce code promo ?')) return
    setDeletingId(id)
    await supabase.from('promo_codes').delete().eq('id', id)
    setCodes(prev => prev.filter(c => c.id !== id))
    setDeletingId(null)
  }

  async function handleSave() {
    if (!form.code || !form.value) { setError('Code et valeur requis'); return }
    setSaving(true)
    setError(null)
    const payload = {
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      value: parseFloat(form.value),
      min_order_amount: form.min_order_amount ? parseFloat(form.min_order_amount) : null,
      expires_at: form.expires_at || null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      restaurant_id: form.restaurant_id || null,
      is_active: form.is_active,
    }
    const { error: err } = await supabase.from('promo_codes').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    setModalOpen(false)
    setForm(EMPTY_FORM)
    loadData()
  }

  const restaurantMap = Object.fromEntries(restaurants.map(r => [r.id, r.name]))

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
    </div>
  )

  return (
    <div className="p-6 sm:p-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Codes promo</h1>
          <p className="text-gray-500 text-sm mt-1">{codes.length} code(s) — globaux et par restaurant</p>
        </div>
        <button
          onClick={() => { setForm(EMPTY_FORM); setError(null); setModalOpen(true) }}
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          <PlusCircle className="w-4 h-4" />Nouveau code
        </button>
      </div>

      {codes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Tag className="w-10 h-10 text-gray-500 mb-3" />
          <p className="text-gray-900 font-semibold">Aucun code promo</p>
          <p className="text-gray-500 text-sm mt-1">Créez votre premier code ci-dessus</p>
        </div>
      ) : (
        <div className="space-y-3">
          {codes.map(code => (
            <div key={code.id} className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
              {/* Ligne 1 : icône + code + badge + actions */}
              <div className="flex items-center gap-3 mb-3">
                <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center flex-shrink-0">
                  {code.discount_type === 'percent' ? <Percent className="w-4 h-4 text-brand-orange" /> : <DollarSign className="w-4 h-4 text-brand-orange" />}
                </div>
                <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-gray-900 font-mono tracking-wider text-base">{code.code}</span>
                  <Badge variant={code.is_active ? 'success' : 'warning'}>
                    {code.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                  {!code.restaurant_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">Global</span>
                  )}
                  {code.restaurant_id && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 border border-gray-300 truncate max-w-[120px]">
                      {restaurantMap[code.restaurant_id] ?? code.restaurant_id}
                    </span>
                  )}
                </div>
                {/* Actions : toggle + stats + supprimer */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {/* Toggle switch */}
                  <button
                    onClick={() => toggleActive(code)}
                    disabled={togglingId === code.id}
                    title={code.is_active ? 'Désactiver' : 'Activer'}
                    className="relative w-10 h-6 rounded-full transition-colors disabled:opacity-50 focus:outline-none flex-shrink-0"
                    style={{ backgroundColor: code.is_active ? '#22c55e' : '#d1d5db' }}
                  >
                    {togglingId === code.id
                      ? <Loader2 className="w-3 h-3 animate-spin absolute inset-0 m-auto text-white" />
                      : <span
                          className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform"
                          style={{ transform: code.is_active ? 'translateX(16px)' : 'translateX(0)' }}
                        />
                    }
                  </button>
                  {/* Stats */}
                  <button
                    onClick={() => openStats(code)}
                    title="Voir les statistiques"
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-500 hover:text-gray-900 transition-colors"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>
                  {/* Supprimer */}
                  <button
                    onClick={() => deleteCode(code.id)}
                    disabled={deletingId === code.id}
                    title="Supprimer"
                    className="w-8 h-8 flex items-center justify-center rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20 disabled:opacity-50"
                  >
                    {deletingId === code.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Ligne 2 : détails en grille 2 colonnes */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 pl-12">
                <span>
                  {code.discount_type === 'percent' ? `−${code.value}%` : `−${formatCurrency(code.value)}`}
                </span>
                <span>{code.current_uses}{code.max_uses ? `/${code.max_uses}` : ''} utilisations</span>
                {code.min_order_amount ? <span>Min : {formatCurrency(code.min_order_amount)}</span> : <span />}
                {code.expires_at ? <span>Expire : {formatDate(code.expires_at)}</span> : <span>Pas d&apos;expiration</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal création */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Nouveau code promo" size="sm">
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>
          )}

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Code promo *</label>
            <input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="Ex: SUMMER20"
              className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:border-brand-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Type</label>
              <select
                value={form.discount_type}
                onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'fixed' | 'percent' }))}
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
              >
                <option value="percent">Pourcentage (%)</option>
                <option value="fixed">Montant fixe (FCFA)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Valeur *</label>
              <input
                type="number"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                placeholder={form.discount_type === 'percent' ? '10' : '1000'}
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Commande min (FCFA)</label>
              <input
                type="number"
                value={form.min_order_amount}
                onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                placeholder="0"
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Utilisations max</label>
              <input
                type="number"
                value={form.max_uses}
                onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                placeholder="Illimité"
                className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Restaurant (laisser vide = global)</label>
            <select
              value={form.restaurant_id}
              onChange={e => setForm(f => ({ ...f, restaurant_id: e.target.value }))}
              className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
            >
              <option value="">Code global (tous les restaurants)</option>
              {restaurants.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Date d&apos;expiration</label>
            <input
              type="date"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              className="w-full bg-gray-100 border border-gray-200 text-gray-900 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-orange"
            />
          </div>

          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
            <span className="text-gray-500 text-sm">Activer immédiatement</span>
          </label>

          <div className="flex gap-3 pt-2">
            <button onClick={() => setModalOpen(false)} className="flex-1 bg-gray-100 hover:bg-gray-100 text-gray-900 py-2.5 rounded-xl text-sm font-semibold transition-colors">Annuler</button>
            <button onClick={handleSave} disabled={saving} className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
              {saving ? 'Création...' : 'Créer'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal stats */}
      <Modal open={!!statsCode} onClose={() => setStatsCode(null)} title={`Stats — ${statsCode?.code}`} size="sm">
        {statsLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-brand-orange" />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-100 rounded-2xl p-5 text-center">
              <p className="text-3xl font-black text-gray-900">{stats.count}</p>
              <p className="text-xs text-gray-500 mt-1">Commandes avec ce code</p>
            </div>
            <div className="bg-gray-100 rounded-2xl p-5 text-center">
              <p className="text-2xl font-black text-brand-orange">{formatCurrency(stats.totalDiscount)}</p>
              <p className="text-xs text-gray-500 mt-1">Total réductions accordées</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  )
}
