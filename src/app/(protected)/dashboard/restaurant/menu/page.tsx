'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ImageUpload } from '@/components/menu/ImageUpload'
import { EmptyState, SkeletonRow } from '@/components/ui/Loading'
import { formatCurrency } from '@/lib/utils'
import { PlusCircle, Pencil, Trash2, UtensilsCrossed, ToggleLeft, ToggleRight, Tag, GripVertical, Check, X as XIcon } from 'lucide-react'
import type { MenuItem, MenuCategory } from '@/lib/types'

export default function MenuPage() {
  const supabase = createClient()

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)

  const [itemModal, setItemModal] = useState(false)
  const [catModal, setCatModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '', is_available: true, image_url: '' as string | null
  })
  const [catName, setCatName] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('restaurant_id')
      .eq('id', user.id)
      .single()

    if (!profile?.restaurant_id) { setLoading(false); return }
    setRestaurantId(profile.restaurant_id)

    const [{ data: cats }, { data: menuItems }] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', profile.restaurant_id).order('position'),
      supabase.from('menu_items').select('*').eq('restaurant_id', profile.restaurant_id).order('position'),
    ])

    setCategories(cats ?? [])
    setItems(menuItems ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchData() }, [fetchData])

  function openCreate() {
    setEditingItem(null)
    setForm({ name: '', description: '', price: '', category_id: '', is_available: true, image_url: null })
    setError(null)
    setItemModal(true)
  }

  function openEdit(item: MenuItem) {
    setEditingItem(item)
    setForm({
      name: item.name,
      description: item.description ?? '',
      price: String(item.price),
      category_id: item.category_id ?? '',
      is_available: item.is_available,
      image_url: item.image_url,
    })
    setError(null)
    setItemModal(true)
  }

  async function saveItem() {
    if (!form.name || !form.price || !restaurantId) {
      setError('Nom et prix sont requis.')
      return
    }
    const priceNum = parseInt(form.price.replace(/\s/g, ''))
    if (isNaN(priceNum) || priceNum < 0) {
      setError('Prix invalide.')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      name: form.name,
      description: form.description || null,
      price: priceNum,
      category_id: form.category_id || null,
      is_available: form.is_available,
      image_url: form.image_url || null,
      restaurant_id: restaurantId,
    }

    if (editingItem) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
    } else {
      await supabase.from('menu_items').insert(payload)
    }

    await fetchData()
    setItemModal(false)
    setSaving(false)
  }

  async function deleteItem(id: string) {
    if (!confirm('Supprimer ce plat ?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    setItems(prev => prev.filter(i => i.id !== id))
  }

  async function toggleAvailable(item: MenuItem) {
    await supabase.from('menu_items').update({ is_available: !item.is_available }).eq('id', item.id)
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, is_available: !i.is_available } : i))
  }

  async function deleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ? Les plats associés perdront leur catégorie.')) return
    await supabase.from('menu_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setItems(prev => prev.map(i => i.category_id === id ? { ...i, category_id: null } : i))
  }

  async function startEditCat(cat: MenuCategory) {
    setEditingCatId(cat.id)
    setEditingCatName(cat.name)
  }

  async function saveEditCat(id: string) {
    if (!editingCatName.trim()) return
    setCatSaving(true)
    await supabase.from('menu_categories').update({ name: editingCatName.trim() }).eq('id', id)
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editingCatName.trim() } : c))
    setEditingCatId(null)
    setCatSaving(false)
  }

  async function saveCategory() {
    if (!catName.trim() || !restaurantId) return
    setSaving(true)
    await supabase.from('menu_categories').insert({
      name: catName.trim(),
      restaurant_id: restaurantId,
      position: categories.length,
    })
    await fetchData()
    setCatName('')
    setCatModal(false)
    setSaving(false)
  }

  const catOptions = [
    { value: '', label: 'Sans catégorie' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Menu</h1>
          <p className="text-gray-500 text-sm mt-1">{items.length} plat(s) · {categories.length} catégorie(s)</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <PlusCircle className="w-4 h-4" />
          Ajouter un plat
        </Button>
      </div>

      {/* ── Gestion des catégories ── */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-orange" />
            <h2 className="text-white font-semibold text-sm">Catégories</h2>
            <span className="text-gray-500 text-xs">({categories.length})</span>
          </div>
          <button
            onClick={() => setCatModal(true)}
            className="flex items-center gap-1.5 text-brand-orange hover:text-brand-orange-dark text-xs font-semibold transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Nouvelle catégorie
          </button>
        </div>

        {categories.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-3">Aucune catégorie — vos plats apparaissent tous ensemble.</p>
        ) : (
          <div className="space-y-2">
            {categories.map(cat => {
              const count = items.filter(i => i.category_id === cat.id).length
              const isEditing = editingCatId === cat.id
              return (
                <div key={cat.id} className="flex items-center gap-3 bg-surface-100 border border-surface-200 rounded-xl px-4 py-2.5">
                  <GripVertical className="w-4 h-4 text-gray-600 flex-shrink-0" />
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={editingCatName}
                        onChange={e => setEditingCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditCat(cat.id); if (e.key === 'Escape') setEditingCatId(null) }}
                        className="flex-1 bg-surface-50 border border-surface-300 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                      />
                      <button onClick={() => saveEditCat(cat.id)} disabled={catSaving} className="p-1.5 text-green-400 hover:text-green-300 transition-colors">
                        <Check className="w-4 h-4" />
                      </button>
                      <button onClick={() => setEditingCatId(null)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                        <XIcon className="w-4 h-4" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-white text-sm font-medium">{cat.name}</span>
                      <span className="text-gray-500 text-xs">{count} plat{count > 1 ? 's' : ''}</span>
                      <button onClick={() => startEditCat(cat)} className="p-1.5 text-gray-500 hover:text-white transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<UtensilsCrossed className="w-7 h-7" />}
          title="Aucun plat dans le menu"
          description="Commencez par ajouter vos premiers plats pour que vos clients puissent commander."
          action={<Button onClick={openCreate}><PlusCircle className="w-4 h-4" /> Ajouter le premier plat</Button>}
        />
      ) : (
        <div className="space-y-2">
          {/* Group by category */}
          {[{ id: null, name: 'Sans catégorie' }, ...categories].map(cat => {
            const catItems = cat.id === null
              ? items.filter(i => !i.category_id)
              : items.filter(i => i.category_id === cat.id)
            if (!catItems.length) return null

            return (
              <div key={cat.id ?? 'none'} className="mb-6">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">
                  {cat.name}
                </p>
                <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
                  {catItems.map((item, idx) => (
                    <div
                      key={item.id}
                      className={`flex items-center gap-4 px-5 py-4 hover:bg-surface-100 transition-colors ${idx < catItems.length - 1 ? 'border-b border-surface-200' : ''}`}
                    >
                      {/* Image placeholder */}
                      <div className="w-12 h-12 rounded-xl bg-surface-200 flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                        {item.description && (
                          <p className="text-gray-500 text-xs truncate">{item.description}</p>
                        )}
                        <p className="text-brand-orange text-xs font-bold mt-0.5">{formatCurrency(item.price)}</p>
                      </div>

                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button
                          onClick={() => toggleAvailable(item)}
                          className="text-gray-500 hover:text-brand-orange transition-colors"
                          title={item.is_available ? 'Rendre indisponible' : 'Rendre disponible'}
                        >
                          {item.is_available
                            ? <ToggleRight className="w-5 h-5 text-green-400" />
                            : <ToggleLeft className="w-5 h-5" />
                          }
                        </button>
                        <Badge variant={item.is_available ? 'success' : 'warning'}>
                          {item.is_available ? 'Dispo' : 'Indispo'}
                        </Badge>
                        <button onClick={() => openEdit(item)} className="text-gray-500 hover:text-white transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => deleteItem(item.id)} className="text-gray-500 hover:text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Item modal */}
      <Modal
        open={itemModal}
        onClose={() => setItemModal(false)}
        title={editingItem ? 'Modifier le plat' : 'Ajouter un plat'}
        size="md"
      >
        <div className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <ImageUpload
            value={form.image_url}
            onChange={url => setForm(p => ({ ...p, image_url: url }))}
          />
          <Input
            label="Nom du plat *"
            placeholder="Burger Teranga"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
          />
          <Input
            label="Description"
            placeholder="Bœuf haché, oignons caramélisés, sauce maison..."
            value={form.description}
            onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
          />
          <Input
            label="Prix (FCFA) *"
            placeholder="2500"
            type="number"
            value={form.price}
            onChange={e => setForm(p => ({ ...p, price: e.target.value }))}
          />
          <Select
            label="Catégorie"
            options={catOptions}
            value={form.category_id}
            onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))}
          />
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="available"
              checked={form.is_available}
              onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))}
              className="w-4 h-4 accent-brand-orange"
            />
            <label htmlFor="available" className="text-gray-300 text-sm">Disponible à la commande</label>
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setItemModal(false)}>Annuler</Button>
            <Button fullWidth loading={saving} onClick={saveItem}>
              {editingItem ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Category modal */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nouvelle catégorie" size="sm">
        <div className="space-y-4">
          <Input
            label="Nom de la catégorie"
            placeholder="Burgers, Boissons, Desserts..."
            value={catName}
            onChange={e => setCatName(e.target.value)}
          />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setCatModal(false)}>Annuler</Button>
            <Button fullWidth loading={saving} onClick={saveCategory}>Créer</Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
