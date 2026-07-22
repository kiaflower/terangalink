'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { PromoCode } from '@/lib/types'
import { formatPrice } from '@/lib/utils'
import { Pencil, Trash2 } from 'lucide-react'
import { FeatureGate } from '@/components/FeatureGate'
import type { PlanKey } from '@/lib/plans'

const emptyPromoForm = { code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '' }

export default function PromotionsPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanKey | null>(null)
  const [form, setForm] = useState(emptyPromoForm)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const load = useCallback(async (bid: string) => {
    const { data } = await supabase.from('promo_codes').select('*').eq('restaurant_id', bid).order('created_at', { ascending: false })
    setCodes(data ?? [])
  }, [supabase])

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (d.restaurant_id) {
        setRestaurantId(d.restaurant_id)
        load(d.restaurant_id)
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('restaurant_id', d.restaurant_id).single()
        setPlan((sub?.plan as PlanKey) ?? 'starter')
      }
    })
  }, [load, supabase])

  async function saveCode() {
    if (!restaurantId || !form.code || !form.discount_value) return
    setSaving(true)
    const payload = {
      code: form.code.toUpperCase(),
      discount_type: form.discount_type as 'percent' | 'fixed',
      discount_value: parseFloat(form.discount_value),
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
    }
    if (editingId) {
      await supabase.from('promo_codes').update(payload).eq('id', editingId)
    } else {
      await supabase.from('promo_codes').insert({ restaurant_id: restaurantId, ...payload })
    }
    await load(restaurantId)
    setForm(emptyPromoForm)
    setEditingId(null)
    setSaving(false)
  }

  function startEdit(c: PromoCode) {
    setEditingId(c.id)
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount ? String(c.min_order_amount) : '',
      max_uses: c.max_uses ? String(c.max_uses) : '',
    })
  }

  function cancelEdit() {
    setEditingId(null)
    setForm(emptyPromoForm)
  }

  async function deleteCode(id: string) {
    if (!restaurantId) return
    if (!confirm('Supprimer ce code promo ?')) return
    await supabase.from('promo_codes').delete().eq('id', id)
    await load(restaurantId)
  }

  async function toggleCode(id: string, is_active: boolean) {
    await supabase.from('promo_codes').update({ is_active: !is_active }).eq('id', id)
    if (restaurantId) await load(restaurantId)
  }

  if (plan === null) return <p className="text-gray-400 text-sm py-8">Chargement...</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Codes promo</h1>

      <FeatureGate plan={plan} feature="codePromo"
        description="Créez des codes promo (pourcentage ou montant fixe) pour vos clients et boostez vos ventes.">
      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <h2 className="text-sm font-medium text-gray-300 mb-4">{editingId ? 'Modifier le code promo' : 'Créer un code promo'}</h2>
        <div className="space-y-3">
          <input
            value={form.code}
            onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
            placeholder="CODE (ex: PROMO20)"
            className="w-full bg-white/5 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange uppercase"
          />
          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.discount_type}
              onChange={e => setForm(f => ({ ...f, discount_type: e.target.value }))}
              className="bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none"
            >
              <option value="percent">Pourcentage (%)</option>
              <option value="fixed">Montant fixe (FCFA)</option>
            </select>
            <input
              type="number"
              value={form.discount_value}
              onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
              placeholder={form.discount_type === 'percent' ? 'Ex: 20' : 'Ex: 2000'}
              className="bg-white/5 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input
              type="number"
              value={form.min_order_amount}
              onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
              placeholder="Commande min. (FCFA)"
              className="bg-white/5 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
            />
            <input
              type="number"
              value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="Max utilisations"
              className="bg-white/5 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
            />
          </div>
          <div className="flex gap-2">
            <button
              onClick={saveCode}
              disabled={saving || !form.code || !form.discount_value}
              className="flex-1 bg-brand-orange text-white py-3 rounded-xl font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : editingId ? 'Enregistrer les modifications' : 'Créer le code'}
            </button>
            {editingId && (
              <button
                onClick={cancelEdit}
                className="px-4 py-3 rounded-xl font-semibold text-gray-500 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
            )}
          </div>
        </div>
      </div>
      </FeatureGate>

      <div className="space-y-3">
        {codes.map(c => {
          const isLocked = !!(c as unknown as { is_featured?: boolean }).is_featured
          return (
          <div key={c.id} className={`bg-white border rounded-xl p-4 flex items-center justify-between gap-3 ${c.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'}`}>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-mono font-bold text-gray-900 text-sm">{c.code}</span>
                {isLocked && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    🔒 Mise en avant
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500">
                {c.discount_type === 'percent' ? `${c.discount_value}%` : formatPrice(c.discount_value)} de réduction
                {c.min_order_amount > 0 && ` · min ${formatPrice(c.min_order_amount)}`}
                {c.max_uses && ` · ${c.uses_count}/${c.max_uses} utilisations`}
              </p>
            </div>
            {isLocked ? (
              <span className="text-xs text-gray-400 italic">Non modifiable</span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => toggleCode(c.id, c.is_active)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${c.is_active ? 'bg-green-50 text-green-600 hover:bg-red-50 hover:text-red-500' : 'bg-gray-100 text-gray-500 hover:bg-green-50 hover:text-green-600'}`}
                >
                  {c.is_active ? 'Actif' : 'Inactif'}
                </button>
                {plan === 'pro' && (
                  <button onClick={() => startEdit(c)} className="p-1.5 rounded-lg text-gray-400 hover:text-brand-orange hover:bg-gray-50 transition-colors" aria-label="Modifier">
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => deleteCode(c.id)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors" aria-label="Supprimer">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          )
        })}
        {codes.length === 0 && (
          <p className="text-center text-gray-500 py-10">Aucun code promo créé</p>
        )}
      </div>
    </div>
  )
}
