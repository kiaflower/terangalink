'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { EmptyState, SkeletonRow } from '@/components/ui/Loading'
import { getPlanFeatures } from '@/lib/plans'
import {
  PlusCircle, Pencil, Trash2, Megaphone, Crown,
  ToggleLeft, ToggleRight,
} from 'lucide-react'
import type { Banner } from '@/components/restaurant/PromoBanners'

interface BannerForm {
  text: string
  icon: string
  bg_color: string
  starts_at: string
  ends_at: string
  is_active: boolean
  position: string
}

const EMPTY_FORM: BannerForm = {
  text: '',
  icon: '',
  bg_color: '#F97316',
  starts_at: '',
  ends_at: '',
  is_active: true,
  position: '0',
}

export default function BannersPage() {
  const supabase = createClient()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('starter')
  const isPremium = getPlanFeatures(plan).variantesProduits

  const [modal, setModal] = useState(false)
  const [editing, setEditing] = useState<Banner | null>(null)
  const [form, setForm] = useState<BannerForm>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

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

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('restaurant_id', p.restaurant_id)
      .single()
    setPlan(sub?.plan ?? 'starter')

    const { data: bannersData } = await supabase
      .from('banners')
      .select('*')
      .eq('restaurant_id', p.restaurant_id)
      .order('position')
      console.log(bannersData)
    setBanners((bannersData as Banner[]) ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function openCreate() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setError(null)
    setModal(true)
  }

  function openEdit(b: Banner) {
    setEditing(b)
    setForm({
      text: b.text,
      icon: b.icon ?? '',
      bg_color: b.bg_color ?? '#F97316',
      starts_at: b.starts_at ? b.starts_at.slice(0, 16) : '',
      ends_at: b.ends_at ? b.ends_at.slice(0, 16) : '',
      is_active: b.is_active,
      position: String(b.position),
    })
    setError(null)
    setModal(true)
  }

  async function handleSave() {
    if (!restaurantId) return
    setError(null)
    if (!form.text.trim()) { setError('Le texte est requis.'); return }

    setSaving(true)
    const payload = {
      restaurant_id: restaurantId,
      text: form.text.trim(),
      icon: form.icon.trim() || null,
      bg_color: form.bg_color || null,
      starts_at: form.starts_at ? new Date(form.starts_at).toISOString() : null,
      ends_at: form.ends_at ? new Date(form.ends_at).toISOString() : null,
      is_active: form.is_active,
      position: parseInt(form.position) || 0,
      updated_at: new Date().toISOString(),
    }

    let err
    if (editing) {
      console.log(payload)
      ;({ error: err } = await supabase.from('banners').update(payload).eq('id', editing.id))
    } else {
      ;({ error: err } = await supabase.from('banners').insert(payload))
    }

    setSaving(false)
    if (err) { setError(err.message); return }
    setModal(false)
    load()
  }

  async function toggleActive(b: Banner) {
    await supabase
      .from('banners')
      .update({ is_active: !b.is_active, updated_at: new Date().toISOString() })
      .eq('id', b.id)
    setBanners(bs => bs.map(x => x.id === b.id ? { ...x, is_active: !x.is_active } : x))
  }

  async function handleDelete(id: string) {
    await supabase.from('banners').delete().eq('id', id)
    setBanners(bs => bs.filter(x => x.id !== id))
    setDeleteConfirm(null)
  }

  if (!isPremium) {
    return (
      <div className="p-6 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/5 p-8 text-center">
          <Crown className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
          <h2 className="text-gray-900 font-bold text-lg mb-2">Fonctionnalité Premium</h2>
          <p className="text-gray-500 text-sm">Les bannières promotionnelles sont disponibles avec le plan <strong className="text-gray-900">Premium</strong>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-gray-900 font-bold text-xl">Bannières promotionnelles</h1>
          <p className="text-gray-500 text-sm mt-0.5">{banners.length} bannière{banners.length !== 1 ? 's' : ''}</p>
        </div>
        <Button onClick={openCreate} variant="primary">
          <PlusCircle className="w-4 h-4 mr-2" />
          Nouvelle bannière
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : banners.length === 0 ? (
        <EmptyState
          icon={<Megaphone className="w-8 h-8 text-gray-500" />}
          title="Aucune bannière"
          description="Créez des bannières pour mettre en avant vos offres spéciales."
          action={<Button onClick={openCreate} variant="primary"><PlusCircle className="w-4 h-4 mr-2" />Créer une bannière</Button>}
        />
      ) : (
        <div className="space-y-3">
          {banners.map(b => (
            <div key={b.id} className="rounded-2xl p-4 bg-gray-50 border border-gray-200 flex items-center gap-4">
              {/* Preview */}
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-gray-900 flex-1 min-w-0"
                style={{ backgroundColor: b.bg_color || '#F97316' }}
              >
                {b.icon && <span className="flex-shrink-0">{b.icon}</span>}
                <span className="truncate">{b.text}</span>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                {!b.is_active && (
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">Inactif</span>
                )}
                <button onClick={() => toggleActive(b)} className="text-gray-500 hover:text-gray-900 transition-colors" title={b.is_active ? 'Désactiver' : 'Activer'}>
                  {b.is_active
                    ? <ToggleRight className="w-5 h-5 text-brand-orange" />
                    : <ToggleLeft className="w-5 h-5" />}
                </button>
                <button onClick={() => openEdit(b)} className="text-gray-500 hover:text-gray-900 transition-colors">
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => setDeleteConfirm(b.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editing ? 'Modifier la bannière' : 'Nouvelle bannière'}>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Texte de la bannière</label>
            <Input value={form.text} onChange={e => setForm(f => ({ ...f, text: e.target.value }))} placeholder="Ex : Livraison offerte ce week-end ! 🚀" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Icône (emoji, optionnel)</label>
            <Input value={form.icon} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} placeholder="🎉" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Couleur de fond</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.bg_color}
                onChange={e => setForm(f => ({ ...f, bg_color: e.target.value }))}
                className="w-12 h-10 bg-gray-100 border border-gray-300 rounded-xl p-1 cursor-pointer"
              />
              <div
                className="flex-1 px-3 py-2 rounded-xl text-sm font-semibold text-gray-900 truncate"
                style={{ backgroundColor: form.bg_color }}
              >
                {form.icon && <span className="mr-2">{form.icon}</span>}
                {form.text || 'Aperçu'}
              </div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Début (optionnel)</label>
              <Input type="datetime-local" value={form.starts_at} onChange={e => setForm(f => ({ ...f, starts_at: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Fin (optionnel)</label>
              <Input type="datetime-local" value={form.ends_at} onChange={e => setForm(f => ({ ...f, ends_at: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1.5">Position (ordre d&apos;affichage)</label>
            <Input type="number" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} placeholder="0" min="0" />
          </div>
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-gray-500 font-medium">Active</span>
            <button onClick={() => setForm(f => ({ ...f, is_active: !f.is_active }))}>
              {form.is_active
                ? <ToggleRight className="w-6 h-6 text-brand-orange" />
                : <ToggleLeft className="w-6 h-6 text-gray-500" />}
            </button>
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <div className="flex gap-2 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setModal(false)}>Annuler</Button>
            <Button variant="primary" fullWidth onClick={handleSave} loading={saving}>
              {editing ? 'Mettre à jour' : 'Créer'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm */}
      <Modal open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} title="Supprimer cette bannière ?">
        <p className="text-gray-500 text-sm mb-4">Cette action est irréversible.</p>
        <div className="flex gap-2">
          <Button variant="secondary" fullWidth onClick={() => setDeleteConfirm(null)}>Annuler</Button>
          <Button variant="danger" fullWidth onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>Supprimer</Button>
        </div>
      </Modal>
    </div>
  )
}
