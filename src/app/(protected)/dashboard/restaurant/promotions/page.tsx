'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { EmptyState, SkeletonRow } from '@/components/ui/Loading'
import { formatCurrency } from '@/lib/utils'
import { getPlanFeatures } from '@/lib/plans'
import {
  PlusCircle, Pencil, Trash2, Tag, Crown,
  ToggleLeft, ToggleRight, Percent, DollarSign,
} from 'lucide-react'
import type { PromoCode } from '@/lib/types'

// ─── Types ────────────────────────────────────────────────────

interface PromoForm {
  code: string
  discount_type: 'fixed' | 'percent'
  value: string
  min_order_amount: string
  expires_at: string
  max_uses: string
  is_active: boolean
}

const EMPTY_FORM: PromoForm = {
  code: '',
  discount_type: 'percent',
  value: '',
  min_order_amount: '',
  expires_at: '',
  max_uses: '',
  is_active: true,
}

// ─── Component ────────────────────────────────────────────────

export default function PromotionsPage() {
  const supabase = createClient()

  const [codes, setCodes] = useState<PromoCode[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('starter')
  const isPremium = getPlanFeatures(plan).codePromo

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<PromoCode | null>(null)
  const [form, setForm] = useState<PromoForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  // ─── Load ────────────────────────────────────────────────────

  const load = useCallback(async () => {
    setLoading(true)
    const { data: profile } = await supabase.auth.getUser()
    if (!profile.user) { setLoading(false); return }

    const { data: p } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', profile.user.id)
      .single()

    if (!p?.restaurant_id) { setLoading(false); return }
    setRestaurantId(p.restaurant_id)

    // Plan
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('restaurant_id', p.restaurant_id)
      .single()
    setPlan(sub?.plan ?? 'starter')

    // Codes promo
    const { data: codesData } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('restaurant_id', p.restaurant_id)
      .order('created_at', { ascending: false })

    setCodes((codesData as PromoCode[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  // ─── Open modal ──────────────────────────────────────────────

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModal(true)
  }

  function openEdit(code: PromoCode) {
    setEditing(code)
    setForm({
      code: code.code,
      discount_type: code.discount_type,
      value: String(code.value),
      min_order_amount: code.min_order_amount != null ? String(code.min_order_amount) : '',
      expires_at: code.expires_at ? code.expires_at.slice(0, 16) : '',
      max_uses: code.max_uses != null ? String(code.max_uses) : '',
      is_active: code.is_active,
    })
    setError(null)
    setModal(true)
  }

  // ─── Save ────────────────────────────────────────────────────

  async function handleSave() {
    if (!restaurantId) return
    setError(null)

    const codeClean = form.code.trim().toUpperCase()
    if (!codeClean) { setError('Le code est requis.'); return }
    const value = parseFloat(form.value)
    if (!value || value <= 0) { setError('La valeur de réduction doit être > 0.'); return }
    if (form.discount_type === 'percent' && value > 100) { setError('Le pourcentage ne peut pas dépasser 100.'); return }

    setSaving(true)
    const payload = {
  restaurant_id: restaurantId,
  code: codeClean,

  type: form.discount_type,          // ← ajouter ceci
  discount_type: form.discount_type,

  value: value,

  min_order_amount: form.min_order_amount
    ? parseFloat(form.min_order_amount)
    : null,

  expires_at: form.expires_at
    ? new Date(form.expires_at).toISOString()
    : null,

  max_uses: form.max_uses
    ? parseInt(form.max_uses)
    : null,

  is_active: form.is_active,
}

    let err
    if (editing) {
      ;({ error: err } = await supabase
        .from('promo_codes')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('promo_codes').insert(payload))
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setModal(false)
    load()
  }

  // ─── Toggle active ───────────────────────────────────────────

  async function toggleActive(code: PromoCode) {
    await supabase
      .from('promo_codes')
      .update({ is_active: !code.is_active, updated_at: new Date().toISOString() })
      .eq('id', code.id)
    setCodes(cs => cs.map(c => c.id === code.id ? { ...c, is_active: !c.is_active } : c))
  }

  // ─── Delete ──────────────────────────────────────────────────

  async function handleDelete(id: string) {
    await supabase.from('promo_codes').delete().eq('id', id)
    setCodes(cs => cs.filter(c => c.id !== id))
    setDeleteConfirm(null)
  }

  // ─── Helpers ─────────────────────────────────────────────────

  function discountLabel(code: PromoCode) {
    return code.discount_type === 'percent'
      ? `−${code.value}%`
      : `−${formatCurrency(code.value)}`
  }

  function isExpired(code: PromoCode) {
    if (!code.expires_at) return false
    return new Date(code.expires_at) < new Date()
  }

  // ─── UI ──────────────────────────────────────────────────────

  if (!isPremium) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
          <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-white font-bold text-lg mb-2">Fonctionnalité Premium</h2>
          <p className="text-gray-400 text-sm">Les codes promo sont disponibles avec le plan <strong className="text-white">Premium</strong>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-white font-bold text-xl">Codes Promo</h1>
          <p className="text-gray-500 text-sm mt-0.5">{codes.length} code{codes.length !== 1 ? 's' : ''} créé{codes.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} variant="primary">
          <PlusCircle className="w-4 h-4 mr-2" />
          Nouveau code
        </Button>
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[...Array(3)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : codes.length === 0 ? (
        <EmptyState
          icon={<Tag className="w-8 h-8 text-gray-600" />}
          title="Aucun code promo"
          description="Créez votre premier code promo pour fidéliser vos clients."
          action={<Button onClick={openCreate} variant="primary"><PlusCircle className="w-4 h-4 mr-2" />Créer un code</Button>}
        />
      ) : (
        <div className="space-y-3">
          {codes.map(code => {
            const expired = isExpired(code)
            return (
              <div
                key={code.id}
                className="rounded-2xl p-4 bg-surface-50 border border-surface-200 flex items-center gap-4"
              >
                {/* Code + discount */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono font-bold text-white text-sm tracking-wider">{code.code}</span>
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-orange/15 text-brand-orange">
                      {discountLabel(code)}
                    </span>
                    {expired && (
                      <Badge variant="danger">Expiré</Badge>
                    )}
                    {!code.is_active && !expired && (
                      <Badge variant="warning">Inactif</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500">
                    {code.min_order_amount != null && (
                      <span>Min. {formatCurrency(code.min_order_amount)}</span>
                    )}
                    {code.expires_at && (
                      <span>Expire {new Date(code.expires_at).toLocaleDateString('fr-SN', { dateStyle: 'medium' })}</span>
                    )}
                    <span>
                      {code.uses_count} utilisation{code.uses_count !== 1 ? 's' : ''}
                      {code.max_uses != null ? ` / ${code.max_uses}` : ''}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => toggleActive(code)}
                    className="text-gray-400 hover:text-white transition-colors"
                    title={code.is_active ? 'Désactiver' : 'Activer'}
                  >
                    {code.is_active
                      ? <ToggleRight className="w-5 h-5 text-brand-orange" />
                      : <ToggleLeft className="w-5 h-5" />}
                  </button>
                  <button
                    onClick={() => openEdit(code)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setDeleteConfirm(code.id)}
                    className="text-gray-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal
        open={modal}
        onClose={() => setModal(false)}
        title={editing ? 'Modifier le code promo' : 'Nouveau code promo'}
      >
        <div className="space-y-4">
          {/* Code */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Code</label>
            <Input
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              placeholder="ex : WELCOME10"
              className="font-mono tracking-widest"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Type de réduction</label>
            <div className="grid grid-cols-2 gap-2">
              {(['percent', 'fixed'] as const).map(type => (
                <button
                  key={type}
                  onClick={() => setForm(f => ({ ...f, discount_type: type }))}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                    form.discount_type === type
                      ? 'border-brand-orange bg-brand-orange/10 text-brand-orange'
                      : 'border-surface-200 bg-surface-50 text-gray-400 hover:text-white'
                  }`}
                >
                  {type === 'percent' ? <Percent className="w-4 h-4" /> : <DollarSign className="w-4 h-4" />}
                  {type === 'percent' ? 'Pourcentage' : 'Montant fixe'}
                </button>
              ))}
            </div>
          </div>

          {/* Value */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">
              Valeur {form.discount_type === 'percent' ? '(%)' : '(FCFA)'}
            </label>
            <Input
              type="number"
              value={form.value}
              onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
              placeholder={form.discount_type === 'percent' ? '10' : '2000'}
              min="0"
            />
          </div>

          {/* Min order */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Commande minimum (FCFA, optionnel)</label>
            <Input
              type="number"
              value={form.min_order_amount}
              onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
              placeholder="5000"
              min="0"
            />
          </div>

          {/* Expiration */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Date d&apos;expiration (optionnel)</label>
            <Input
              type="datetime-local"
              value={form.expires_at}
              onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
            />
          </div>

          {/* Max uses */}
          <div>
            <label className="block text-xs font-semibold text-gray-400 uppercase mb-1.5">Limite d&apos;utilisation (optionnel)</label>
            <Input
              type="number"
              value={form.max_uses}
              onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
              placeholder="100"
              min="1"
            />
          </div>

          {/* Active */}
          <div className="flex items-center justify-between py-2">
            <span className="text-sm text-gray-300 font-medium">Actif</span>
            <button
              onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}
              className="transition-colors"
            >
              {form.is_active
                ? <ToggleRight className="w-6 h-6 text-brand-orange" />
                : <ToggleLeft className="w-6 h-6 text-gray-500" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModal(false)}>Annuler</Button>
            <Button variant="primary" fullWidth onClick={handleSave} disabled={saving}>
              {saving ? 'Enregistrement...' : editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Supprimer ce code promo ?"
      >
        <p className="text-gray-400 text-sm mb-4">Cette action est irréversible.</p>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setDeleteConfirm(null)}>Annuler</Button>
          <Button variant="danger" fullWidth onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
            Supprimer
          </Button>
        </div>
      </Modal>
    </div>
  )
}
