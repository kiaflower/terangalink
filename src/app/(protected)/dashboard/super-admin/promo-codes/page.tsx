'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, RefreshCw, Tag, Lock, Trash2, Pencil } from 'lucide-react'
import { formatPrice } from '@/lib/utils'

interface PromoCode {
  id: string
  boutique_id: string
  code: string
  discount_type: 'percent' | 'fixed'
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  uses_count: number
  is_active: boolean
  expires_at: string | null
  is_featured: boolean
  created_at: string
  boutique: { id: string; name: string } | null
}

interface Boutique { id: string; name: string }

const iCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange transition-colors'

export default function SuperAdminPromoCodesPage() {
  const supabase = createClient()
  const [codes, setCodes] = useState<PromoCode[]>([])
  const [boutiques, setBoutiques] = useState<Boutique[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState({
    boutique_id: '', code: '', discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '', min_order_amount: '', max_uses: '', expires_at: '', is_featured: false,
  })
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  // Edit modal
  const [editCode, setEditCode] = useState<PromoCode | null>(null)
  const [editForm, setEditForm] = useState({
    code: '', discount_type: 'percent' as 'percent' | 'fixed',
    discount_value: '', min_order_amount: '', max_uses: '', expires_at: '', is_featured: false, is_active: true,
  })
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('promo_codes')
      .select('*, boutique:boutiques(id, name)')
      .order('created_at', { ascending: false })
      .limit(200)
    setCodes((data ?? []) as unknown as PromoCode[])
    const { data: b } = await supabase.from('boutiques').select('id, name').order('name')
    setBoutiques(b ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  async function createCode() {
    setSaveError('')
    if (!form.boutique_id || !form.code || !form.discount_value) {
      setSaveError('Boutique, code et réduction sont requis.'); return
    }
    setSaving(true)
    const { error } = await supabase.from('promo_codes').insert({
      boutique_id: form.boutique_id,
      code: form.code.toUpperCase().trim(),
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      min_order_amount: parseFloat(form.min_order_amount) || 0,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
      is_active: true,
      is_featured: form.is_featured,
    } as unknown as object)
    if (error) { setSaveError(error.message); setSaving(false); return }
    setSaving(false)
    setCreateOpen(false)
    setForm({ boutique_id: '', code: '', discount_type: 'percent', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '', is_featured: false })
    await load()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('promo_codes').update({ is_active: !current }).eq('id', id)
    await load()
  }

  async function toggleFeatured(id: string, current: boolean) {
    await supabase.from('promo_codes').update({ is_featured: !current } as unknown as object).eq('id', id)
    await load()
  }

  function openEdit(c: PromoCode) {
    setEditCode(c)
    setEditError('')
    setEditForm({
      code: c.code,
      discount_type: c.discount_type,
      discount_value: String(c.discount_value),
      min_order_amount: c.min_order_amount > 0 ? String(c.min_order_amount) : '',
      max_uses: c.max_uses ? String(c.max_uses) : '',
      expires_at: c.expires_at ? c.expires_at.split('T')[0] : '',
      is_featured: c.is_featured,
      is_active: c.is_active,
    })
  }

  async function saveEdit() {
    if (!editCode) return
    setEditError('')
    if (!editForm.code || !editForm.discount_value) { setEditError('Code et réduction sont requis.'); return }
    setEditSaving(true)
    const { error } = await supabase.from('promo_codes').update({
      code: editForm.code.toUpperCase().trim(),
      discount_type: editForm.discount_type,
      discount_value: parseFloat(editForm.discount_value),
      min_order_amount: parseFloat(editForm.min_order_amount) || 0,
      max_uses: editForm.max_uses ? parseInt(editForm.max_uses) : null,
      expires_at: editForm.expires_at || null,
      is_featured: editForm.is_featured,
      is_active: editForm.is_active,
    } as unknown as object).eq('id', editCode.id)
    if (error) { setEditError(error.message); setEditSaving(false); return }
    setEditSaving(false)
    setEditCode(null)
    await load()
  }

  async function deleteCode(id: string, code: string) {
    if (!confirm(`Supprimer le code "${code}" ?`)) return
    setDeleting(id)
    await supabase.from('promo_codes').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  const filtered = codes.filter(c =>
    !search ||
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.boutique as { name: string } | null)?.name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Codes promo</h1>
          <p className="text-gray-500 text-sm mt-1">{codes.length} code(s) au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setCreateOpen(true); setSaveError('') }}
            className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-orange-dark transition-colors">
            <Plus className="w-4 h-4" /> Créer un code promo
          </button>
        </div>
      </div>

      <div className="mb-4">
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par code ou boutique…"
          className="w-full sm:w-72 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange transition-colors" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-12">Chargement…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">{search ? 'Aucun résultat' : 'Aucun code promo'}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered.map(c => (
              <div key={c.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <span className="font-mono font-bold text-gray-900">{c.code}</span>
                    {c.is_featured && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                        <Lock className="w-2.5 h-2.5" /> Mise en avant
                      </span>
                    )}
                    {!c.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactif</span>}
                  </div>
                  <p className="text-xs text-gray-500">
                    {(c.boutique as { name: string } | null)?.name ?? '—'} ·{' '}
                    <span className="text-brand-orange font-semibold">
                      {c.discount_type === 'percent' ? `${c.discount_value}%` : formatPrice(c.discount_value)}
                    </span>
                    {c.min_order_amount > 0 && ` · min ${formatPrice(c.min_order_amount)}`} · {c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''} util.
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                  <button onClick={() => openEdit(c)}
                    className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => toggleActive(c.id, c.is_active)}
                    className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-brand-orange/30 hover:text-brand-orange transition-colors text-gray-500">
                    {c.is_active ? 'Désactiver' : 'Activer'}
                  </button>
                  <button onClick={() => toggleFeatured(c.id, c.is_featured)}
                    className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors ${c.is_featured ? 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100' : 'border-gray-200 text-gray-500 hover:border-amber-300 hover:text-amber-600'}`}>
                    {c.is_featured ? '🔒 Verrouillé' : '📌 Mettre en avant'}
                  </button>
                  <button onClick={() => deleteCode(c.id, c.code)} disabled={deleting === c.id}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editCode && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Modifier <span className="font-mono text-brand-orange">{editCode.code}</span></h3>
              <button onClick={() => setEditCode(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              {editError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{editError}</p>}
              <p className="text-xs text-gray-400">Boutique : <span className="font-medium text-gray-700">{(editCode.boutique as { name: string } | null)?.name ?? '—'}</span></p>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Code promo *</label>
                <input type="text" value={editForm.code}
                  onChange={e => setEditForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  className={`${iCls} font-mono uppercase`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Type *</label>
                  <select value={editForm.discount_type} onChange={e => setEditForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))} className={iCls}>
                    <option value="percent">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Valeur *</label>
                  <input type="number" value={editForm.discount_value}
                    onChange={e => setEditForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={editForm.discount_type === 'percent' ? '20' : '1000'} className={iCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Commande min (FCFA)</label>
                  <input type="number" value={editForm.min_order_amount}
                    onChange={e => setEditForm(f => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="0" className={iCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Utilisations max</label>
                  <input type="number" value={editForm.max_uses}
                    onChange={e => setEditForm(f => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Illimité" className={iCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Date d&apos;expiration</label>
                <input type="date" value={editForm.expires_at}
                  onChange={e => setEditForm(f => ({ ...f, expires_at: e.target.value }))} className={iCls} />
              </div>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_active}
                    onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                    className="w-4 h-4 accent-brand-orange" />
                  <span className="text-sm text-gray-700">Actif</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={editForm.is_featured}
                    onChange={e => setEditForm(f => ({ ...f, is_featured: e.target.checked }))}
                    className="w-4 h-4 accent-amber-500" />
                  <span className="text-sm text-gray-700">Mise en avant 🔒</span>
                </label>
              </div>
              <button onClick={saveEdit} disabled={editSaving}
                className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                {editSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Créer un code promo</h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              {saveError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{saveError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Boutique *</label>
                <select value={form.boutique_id} onChange={e => setForm(f => ({ ...f, boutique_id: e.target.value }))} className={iCls}>
                  <option value="">Sélectionner une boutique…</option>
                  {boutiques.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Code promo *</label>
                <input type="text" value={form.code}
                  onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                  placeholder="PROMO20" className={`${iCls} font-mono uppercase`} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Type *</label>
                  <select value={form.discount_type} onChange={e => setForm(f => ({ ...f, discount_type: e.target.value as 'percent' | 'fixed' }))} className={iCls}>
                    <option value="percent">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (FCFA)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Valeur *</label>
                  <input type="number" value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                    placeholder={form.discount_type === 'percent' ? '20' : '1000'} className={iCls} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Commande min (FCFA)</label>
                  <input type="number" value={form.min_order_amount}
                    onChange={e => setForm(f => ({ ...f, min_order_amount: e.target.value }))}
                    placeholder="0" className={iCls} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Utilisations max</label>
                  <input type="number" value={form.max_uses}
                    onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                    placeholder="Illimité" className={iCls} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Date d&apos;expiration</label>
                <input type="date" value={form.expires_at}
                  onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} className={iCls} />
              </div>
              <label className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 hover:border-amber-300 cursor-pointer transition-colors">
                <input type="checkbox" checked={form.is_featured}
                  onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                  className="w-4 h-4 accent-amber-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Mise en avant 🔒</p>
                  <p className="text-xs text-gray-400">La boutique ne pourra pas modifier ni supprimer ce code</p>
                </div>
              </label>
              <button onClick={createCode} disabled={saving}
                className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                {saving ? 'Création…' : 'Créer le code promo'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
