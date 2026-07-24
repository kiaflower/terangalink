'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Plus, RefreshCw, Star, Trash2, Pencil } from 'lucide-react'

interface BlockItemRow {
  sort_order: number
  restaurants: { id: string; name: string } | { id: string; name: string }[] | null
}

interface FeaturedBlockRow {
  id: string
  title: string
  position: 'top' | 'mid' | 'bottom'
  page_number: number
  is_active: boolean
  sort_order: number
  created_at: string
  featured_block_items: BlockItemRow[]
}

interface Restaurant { id: string; name: string }
interface SelectedItem { restaurant_id: string; sort_order: number }

const iCls = 'w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange transition-colors'

const POSITION_LABELS: Record<string, string> = { top: 'En haut', mid: 'Au milieu', bottom: 'En bas' }

function normalizeRestaurant(b: BlockItemRow['restaurants']): { id: string; name: string } | null {
  if (!b) return null
  return Array.isArray(b) ? (b[0] ?? null) : b
}

interface FormState {
  title: string
  position: 'top' | 'mid'
  page_number: number
  is_active: boolean
  items: SelectedItem[]
}

const emptyForm = (): FormState => ({
  title: 'Coup de cœur de la semaine', position: 'top', page_number: 1, is_active: true, items: [],
})

function RestaurantMultiSelect({ restaurants, items, onToggle, onReorder }: {
  restaurants: Restaurant[]
  items: SelectedItem[]
  onToggle: (id: string) => void
  onReorder: (id: string, order: number) => void
}) {
  return (
    <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto overflow-x-hidden divide-y divide-gray-50">
      {restaurants.map(bt => {
        const selected = items.find(i => i.restaurant_id === bt.id)
        return (
          <label key={bt.id} className="flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={!!selected} onChange={() => onToggle(bt.id)}
              className="w-4 h-4 accent-brand-orange shrink-0" />
            <span className="text-sm text-gray-800 flex-1 truncate">{bt.name}</span>
            {selected && (
              <input type="number" value={selected.sort_order} min={0}
                onChange={e => onReorder(bt.id, Number(e.target.value))}
                onClick={e => e.stopPropagation()}
                className="w-14 border border-gray-200 rounded-lg px-2 py-1 text-xs text-gray-700 shrink-0" />
            )}
          </label>
        )
      })}
      {restaurants.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Aucun restaurant disponible</p>}
    </div>
  )
}

export default function SuperAdminFeaturedPage() {
  const supabase = createClient()
  const [blocks, setBlocks] = useState<FeaturedBlockRow[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [form, setForm] = useState<FormState>(emptyForm())
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')

  const [editBlock, setEditBlock] = useState<FeaturedBlockRow | null>(null)
  const [editForm, setEditForm] = useState<FormState>(emptyForm())
  const [editSaving, setEditSaving] = useState(false)
  const [editError, setEditError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('featured_blocks')
      .select('*, featured_block_items(sort_order, restaurants(id, name))')
      .order('sort_order')
    setBlocks((data ?? []) as unknown as FeaturedBlockRow[])
    const { data: b } = await supabase.from('restaurants').select('id, name').eq('is_active', true).order('name')
    setRestaurants(b ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { load() }, [load])

  function toggleItem(items: SelectedItem[], id: string): SelectedItem[] {
    if (items.some(i => i.restaurant_id === id)) return items.filter(i => i.restaurant_id !== id)
    return [...items, { restaurant_id: id, sort_order: items.length }]
  }
  function reorderItem(items: SelectedItem[], id: string, order: number): SelectedItem[] {
    return items.map(i => (i.restaurant_id === id ? { ...i, sort_order: order } : i))
  }

  async function saveItems(blockId: string, items: SelectedItem[]) {
    await supabase.from('featured_block_items').delete().eq('block_id', blockId)
    if (items.length) {
      await supabase.from('featured_block_items').insert(
        items.map(i => ({ block_id: blockId, restaurant_id: i.restaurant_id, sort_order: i.sort_order })) as unknown as object[]
      )
    }
  }

  async function createBlock() {
    setSaveError('')
    if (!form.title || form.items.length === 0) { setSaveError('Titre et au moins un restaurant sont requis.'); return }
    setSaving(true)
    const { data, error } = await supabase.from('featured_blocks').insert({
      title: form.title.trim(),
      position: form.position,
      page_number: form.page_number,
      is_active: form.is_active,
    } as unknown as object).select('id').single()
    if (error || !data) { setSaveError(error?.message ?? 'Erreur lors de la création.'); setSaving(false); return }
    await saveItems(data.id, form.items)
    setSaving(false)
    setCreateOpen(false)
    setForm(emptyForm())
    await load()
  }

  async function toggleActive(id: string, current: boolean) {
    await supabase.from('featured_blocks').update({ is_active: !current } as unknown as object).eq('id', id)
    await load()
  }

  function openEdit(block: FeaturedBlockRow) {
    setEditBlock(block)
    setEditError('')
    setEditForm({
      title: block.title,
      position: block.position === 'mid' ? 'mid' : 'top',
      page_number: block.page_number ?? 1,
      is_active: block.is_active,
      items: (block.featured_block_items ?? [])
        .map(i => {
          const b = normalizeRestaurant(i.restaurants)
          return b ? { restaurant_id: b.id, sort_order: i.sort_order } : null
        })
        .filter((i): i is SelectedItem => i !== null)
        .sort((a, b) => a.sort_order - b.sort_order),
    })
  }

  async function saveEdit() {
    if (!editBlock) return
    setEditError('')
    if (!editForm.title || editForm.items.length === 0) { setEditError('Titre et au moins un restaurant sont requis.'); return }
    setEditSaving(true)
    const { error } = await supabase.from('featured_blocks').update({
      title: editForm.title.trim(),
      position: editForm.position,
      page_number: editForm.page_number,
      is_active: editForm.is_active,
    } as unknown as object).eq('id', editBlock.id)
    if (error) { setEditError(error.message); setEditSaving(false); return }
    await saveItems(editBlock.id, editForm.items)
    setEditSaving(false)
    setEditBlock(null)
    await load()
  }

  async function deleteBlock(id: string, title: string) {
    if (!confirm(`Supprimer le bloc "${title}" ?`)) return
    setDeleting(id)
    await supabase.from('featured_blocks').delete().eq('id', id)
    await load()
    setDeleting(null)
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Coups de cœur</h1>
          <p className="text-gray-500 text-sm mt-1">{blocks.length} bloc(s) au total</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={load} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => { setCreateOpen(true); setSaveError('') }}
            className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-orange-dark transition-colors">
            <Plus className="w-4 h-4" /> Créer un bloc
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <p className="text-center text-gray-400 text-sm py-12">Chargement…</p>
        ) : blocks.length === 0 ? (
          <div className="py-16 text-center">
            <Star className="w-8 h-8 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-400 text-sm">Aucun bloc coup de cœur</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {blocks.map(b => {
              const names = (b.featured_block_items ?? [])
                .slice()
                .sort((x, y) => x.sort_order - y.sort_order)
                .map(i => normalizeRestaurant(i.restaurants)?.name)
                .filter(Boolean)
                .join(', ')
              return (
                <div key={b.id} className="px-5 py-4 flex items-center gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-gray-900">{b.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        {POSITION_LABELS[b.position] ?? b.position}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                        Page {b.page_number ?? 1}
                      </span>
                      {!b.is_active && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactif</span>}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{names || '—'}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
                    <button onClick={() => openEdit(b)}
                      className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => toggleActive(b.id, b.is_active)}
                      className="text-xs px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-brand-orange/30 hover:text-brand-orange transition-colors text-gray-500">
                      {b.is_active ? 'Désactiver' : 'Activer'}
                    </button>
                    <button onClick={() => deleteBlock(b.id, b.title)} disabled={deleting === b.id}
                      className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Edit modal */}
      {editBlock && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Modifier le bloc</h3>
              <button onClick={() => setEditBlock(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              {editError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{editError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre du bloc *</label>
                <input type="text" value={editForm.title}
                  onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Coup de cœur de la semaine" className={iCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Position</label>
                  <select value={editForm.position} onChange={e => setEditForm(f => ({ ...f, position: e.target.value as 'top' | 'mid' }))} className={iCls}>
                    <option value="top">En haut</option>
                    <option value="mid">Au milieu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Page</label>
                  <select value={editForm.page_number} onChange={e => setEditForm(f => ({ ...f, page_number: Number(e.target.value) }))} className={iCls}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Page {n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Restaurants * (sélection multiple, ordre d&apos;affichage)</label>
                <RestaurantMultiSelect restaurants={restaurants} items={editForm.items}
                  onToggle={id => setEditForm(f => ({ ...f, items: toggleItem(f.items, id) }))}
                  onReorder={(id, order) => setEditForm(f => ({ ...f, items: reorderItem(f.items, id, order) }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={editForm.is_active}
                  onChange={e => setEditForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm text-gray-700">Actif</span>
              </label>
              <button onClick={saveEdit} disabled={editSaving}
                className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                {editSaving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">Créer un bloc coup de cœur</h3>
              <button onClick={() => setCreateOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>
            <div className="p-6 space-y-3">
              {saveError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{saveError}</p>}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Titre du bloc *</label>
                <input type="text" value={form.title}
                  onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="Coup de cœur de la semaine" className={iCls} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Position</label>
                  <select value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value as 'top' | 'mid' }))} className={iCls}>
                    <option value="top">En haut</option>
                    <option value="mid">Au milieu</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">Page</label>
                  <select value={form.page_number} onChange={e => setForm(f => ({ ...f, page_number: Number(e.target.value) }))} className={iCls}>
                    {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>Page {n}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">Restaurants * (sélection multiple, ordre d&apos;affichage)</label>
                <RestaurantMultiSelect restaurants={restaurants} items={form.items}
                  onToggle={id => setForm(f => ({ ...f, items: toggleItem(f.items, id) }))}
                  onReorder={(id, order) => setForm(f => ({ ...f, items: reorderItem(f.items, id, order) }))} />
              </div>
              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input type="checkbox" checked={form.is_active}
                  onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm text-gray-700">Actif</span>
              </label>
              <button onClick={createBlock} disabled={saving}
                className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                {saving ? 'Création…' : 'Créer le bloc'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
