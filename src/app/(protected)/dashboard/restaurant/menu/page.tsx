'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ImageUpload } from '@/components/menu/ImageUpload'
import { MultiImageUpload } from '@/components/menu/MultiImageUpload'
import { EmptyState, SkeletonRow } from '@/components/ui/Loading'
import { formatCurrency } from '@/lib/utils'
import { getPlanFeatures } from '@/lib/plans'
import {
  PlusCircle, Pencil, Trash2, UtensilsCrossed,
  ToggleLeft, ToggleRight, Tag, GripVertical,
  Check, X as XIcon, Plus, AlertTriangle, Package,
  Clock, Crown, ImageIcon, CheckCircle,
} from 'lucide-react'
import type { MenuItem, MenuCategory, MenuItemVariant } from '@/lib/types'

// ─── helpers ──────────────────────────────────────────────────
function stockBadge(item: MenuItem) {
  if (!item.stock_enabled) return null
  const qty = item.stock_quantity ?? 0
  if (qty <= 0) return <span className="text-xs font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full">Rupture</span>
  if (qty <= (item.stock_low_threshold ?? 5)) return <span className="text-xs font-semibold text-yellow-400 bg-yellow-500/10 px-2 py-0.5 rounded-full">⚠ Stock faible ({qty})</span>
  return <span className="text-xs text-gray-500">{qty} en stock</span>
}

function preorderBadge(item: MenuItem) {
  if (!item.preorder_enabled) return null
  const now = new Date()
  const close = item.preorder_close_at ? new Date(item.preorder_close_at) : null
  if (close && now > close) return <span className="text-xs font-semibold text-gray-400 bg-surface-200 px-2 py-0.5 rounded-full">Précommandes terminées</span>
  const reserved = item.preorder_reserved ?? 0
  const max = item.preorder_max_qty
  return <span className="text-xs font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
    Précommande {max ? `${reserved}/${max}` : `(${reserved})`}
  </span>
}

// ─── Component ────────────────────────────────────────────────
export default function MenuPage() {
  const supabase = createClient()

  const [items, setItems] = useState<MenuItem[]>([])
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('starter')
  const isPremium = getPlanFeatures(plan).variantesProduits


  // Menu complet (Premium)
  const [showFullMenu, setShowFullMenu] = useState(false)
  const [fullMenuImageUrl, setFullMenuImageUrl] = useState<string | null>(null)
  const [fullMenuSaving, setFullMenuSaving] = useState(false)
  const [fullMenuMsg, setFullMenuMsg] = useState<'saved' | 'error' | null>(null)

  // Modals
  const [itemModal, setItemModal] = useState(false)
  const [catModal, setCatModal] = useState(false)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)

  // Formulaire plat
  const [form, setForm] = useState({
    name: '', description: '', price: '', category_id: '',
    is_available: true, image_url: '' as string | null,
  })
  const [imageUrls, setImageUrls] = useState<string[]>([])

  // Produit mis en avant (Premium)
  const [isFeatured, setIsFeatured] = useState(false)
  const [featuredLabel, setFeaturedLabel] = useState<'Best Seller' | 'Nouveau' | 'Promotion' | 'Recommandé' | null>(null)
  const [isPinned, setIsPinned] = useState(false)

  // Variantes (Premium)
  const [variants, setVariants] = useState<{ id?: string; name: string; price: string }[]>([])

  // Stock (Premium)
  const [stockEnabled, setStockEnabled] = useState(false)
  const [stockQty, setStockQty] = useState('')
  const [stockThreshold, setStockThreshold] = useState('5')

  // Précommandes (Premium)
  const [preorderEnabled, setPreorderEnabled] = useState(false)
  const [preorderOpenAt, setPreorderOpenAt] = useState('')
  const [preorderCloseAt, setPreorderCloseAt] = useState('')
  const [preorderDelivery, setPreorderDelivery] = useState('')
  const [preorderMaxQty, setPreorderMaxQty] = useState('')

  // Catégories
  const [catName, setCatName] = useState('')
  const [editingCatId, setEditingCatId] = useState<string | null>(null)
  const [editingCatName, setEditingCatName] = useState('')
  const [catSaving, setCatSaving] = useState(false)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ── Fetch ──────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!profile?.restaurant_id) { setLoading(false); return }
    setRestaurantId(profile.restaurant_id)

    const [{ data: cats }, { data: menuItems }, { data: sub }, { data: resto }] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', profile.restaurant_id).order('position'),
      supabase.from('menu_items').select('*, variants:menu_item_variants(*)').eq('restaurant_id', profile.restaurant_id).order('position'),
      supabase.from('subscriptions').select('plan').eq('restaurant_id', profile.restaurant_id).single(),
      supabase.from('restaurants').select('show_full_menu, full_menu_image_url').eq('id', profile.restaurant_id).single(),
    ])

    setCategories(cats ?? [])
    setItems(menuItems ?? [])
    if (sub?.plan) setPlan(sub.plan)
    if (resto) {
      setShowFullMenu((resto as { show_full_menu?: boolean }).show_full_menu ?? false)
      setFullMenuImageUrl((resto as { full_menu_image_url?: string | null }).full_menu_image_url ?? null)
    }
    setLoading(false)
  }, [supabase])

  async function saveFullMenu(newShow: boolean, newUrl: string | null) {
    if (!restaurantId) return
    setFullMenuSaving(true)
    const { error } = await supabase
      .from('restaurants')
      .update({ show_full_menu: newShow, full_menu_image_url: newUrl })
      .eq('id', restaurantId)
    setFullMenuSaving(false)
    setFullMenuMsg(error ? 'error' : 'saved')
    setTimeout(() => setFullMenuMsg(null), 2500)
  }

  useEffect(() => { fetchData() }, [fetchData])

  // ── Ouvrir modal création ──────────────────────────────────
  function openCreate() {
    setEditingItem(null)
    setForm({ name: '', description: '', price: '', category_id: '', is_available: true, image_url: null })
    setImageUrls([])
    setVariants([])
    setIsFeatured(false)
    setFeaturedLabel(null)
    setIsPinned(false)
    setStockEnabled(false); setStockQty(''); setStockThreshold('5')
    setPreorderEnabled(false); setPreorderOpenAt(''); setPreorderCloseAt(''); setPreorderDelivery(''); setPreorderMaxQty('')
    setError(null)
    setItemModal(true)
  }

  // ── Ouvrir modal édition ───────────────────────────────────
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
    setImageUrls(item.image_urls ?? (item.image_url ? [item.image_url] : []))
    setVariants((item.variants ?? []).map(v => ({ id: v.id, name: v.name, price: String(v.price) })))
    setIsFeatured(item.is_featured ?? false)
    setFeaturedLabel((item.featured_label as typeof featuredLabel) ?? null)
    setIsPinned(item.is_pinned ?? false)
    setStockEnabled(item.stock_enabled ?? false)
    setStockQty(item.stock_quantity != null ? String(item.stock_quantity) : '')
    setStockThreshold(String(item.stock_low_threshold ?? 5))
    setPreorderEnabled(item.preorder_enabled ?? false)
    setPreorderOpenAt(item.preorder_open_at?.slice(0, 16) ?? '')
    setPreorderCloseAt(item.preorder_close_at?.slice(0, 16) ?? '')
    setPreorderDelivery(item.preorder_delivery_date ?? '')
    setPreorderMaxQty(item.preorder_max_qty != null ? String(item.preorder_max_qty) : '')
    setError(null)
    setItemModal(true)
  }

  // ── Sauvegarder plat ──────────────────────────────────────
  async function saveItem() {
    if (!form.name || !restaurantId) { setError('Nom requis.'); return }
    const hasVariants = isPremium && variants.length > 0
    if (!hasVariants && !form.price) { setError('Prix requis.'); return }
    const priceNum = hasVariants ? 0 : parseInt(form.price.replace(/\s/g, ''))
    if (!hasVariants && (isNaN(priceNum) || priceNum < 0)) { setError('Prix invalide.'); return }

    setSaving(true); setError(null)

    const payload: Record<string, unknown> = {
      name: form.name,
      description: form.description || null,
      price: hasVariants ? Math.min(...variants.map(v => parseInt(v.price) || 0)) : priceNum,
      category_id: form.category_id || null,
      is_available: form.is_available,
      image_url: imageUrls[0] || form.image_url || null,
      image_urls: imageUrls,
      restaurant_id: restaurantId,
      // Stock
      stock_enabled: isPremium ? stockEnabled : false,
      stock_quantity: isPremium && stockEnabled && stockQty ? parseInt(stockQty) : null,
      stock_low_threshold: isPremium && stockEnabled ? parseInt(stockThreshold) || 5 : 5,
      // Précommandes
      preorder_enabled: isPremium ? preorderEnabled : false,
      preorder_open_at: isPremium && preorderEnabled && preorderOpenAt ? new Date(preorderOpenAt).toISOString() : null,
      preorder_close_at: isPremium && preorderEnabled && preorderCloseAt ? new Date(preorderCloseAt).toISOString() : null,
      preorder_delivery_date: isPremium && preorderEnabled ? preorderDelivery || null : null,
      preorder_max_qty: isPremium && preorderEnabled && preorderMaxQty ? parseInt(preorderMaxQty) : null,
      // Mis en avant
      is_featured: isPremium ? isFeatured : false,
      featured_label: isPremium && isFeatured ? featuredLabel : null,
      is_pinned: isPremium ? isPinned : false,
    }

    let itemId = editingItem?.id
    if (editingItem) {
      await supabase.from('menu_items').update(payload).eq('id', editingItem.id)
    } else {
      const { data } = await supabase.from('menu_items').insert(payload).select().single()
      itemId = data?.id
    }

    // Sauvegarder variantes (Premium)
    if (isPremium && itemId) {
      await supabase.from('menu_item_variants').delete().eq('menu_item_id', itemId)
      if (variants.length > 0) {
        await supabase.from('menu_item_variants').insert(
          variants
            .filter(v => v.name.trim())
            .map((v, i) => ({
              menu_item_id: itemId,
              restaurant_id: restaurantId,
              name: v.name.trim(),
              price: parseInt(v.price) || 0,
              position: i,
            }))
        )
      }
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

  // ── Catégories ─────────────────────────────────────────────
  async function deleteCategory(id: string) {
    if (!confirm('Supprimer cette catégorie ? Les plats associés perdront leur catégorie.')) return
    await supabase.from('menu_categories').delete().eq('id', id)
    setCategories(prev => prev.filter(c => c.id !== id))
    setItems(prev => prev.map(i => i.category_id === id ? { ...i, category_id: null } : i))
  }

  async function saveEditCat(id: string) {
    if (!editingCatName.trim()) return
    setCatSaving(true)
    await supabase.from('menu_categories').update({ name: editingCatName.trim() }).eq('id', id)
    setCategories(prev => prev.map(c => c.id === id ? { ...c, name: editingCatName.trim() } : c))
    setEditingCatId(null); setCatSaving(false)
  }

  async function saveCategory() {
    if (!catName.trim() || !restaurantId) return
    setSaving(true)
    await supabase.from('menu_categories').insert({ name: catName.trim(), restaurant_id: restaurantId, position: categories.length })
    await fetchData()
    setCatName(''); setCatModal(false); setSaving(false)
  }

  const catOptions = [
    { value: '', label: 'Sans catégorie' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ]

  // ── Affichage du prix dans la liste ───────────────────────
  function displayPrice(item: MenuItem) {
    const vars = item.variants ?? []
    if (vars.length > 0) {
      const min = Math.min(...vars.map(v => v.price))
      return `À partir de ${formatCurrency(min)}`
    }
    return formatCurrency(item.price)
  }

  // ─────────────────────────────────────────────────────────
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

      {/* ── Menu complet Premium ── */}
      {isPremium && (
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 mb-6">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <ImageIcon className="w-4 h-4 text-brand-orange" />
              <h2 className="text-white font-semibold text-sm">Menu complet</h2>
            </div>
            <div className="flex items-center gap-3">
              {fullMenuSaving && <span className="text-xs text-gray-500">Sauvegarde...</span>}
              {fullMenuMsg === 'saved' && <span className="flex items-center gap-1 text-xs text-green-400"><CheckCircle className="w-3.5 h-3.5" />Sauvegardé</span>}
              {fullMenuMsg === 'error' && <span className="text-xs text-red-400">Erreur</span>}
              <button
                onClick={() => {
                  const next = !showFullMenu
                  setShowFullMenu(next)
                  saveFullMenu(next, fullMenuImageUrl)
                }}
                title={showFullMenu ? 'Désactiver' : 'Activer'}
              >
                {showFullMenu
                  ? <ToggleRight className="w-6 h-6 text-brand-orange" />
                  : <ToggleLeft className="w-6 h-6 text-gray-500" />}
              </button>
            </div>
          </div>
          <p className="text-gray-500 text-xs mb-4">
            Affiche une image de votre menu complet juste après la bannière, avant les catégories. Cliquable pour zoomer.
          </p>
          {showFullMenu && (
            <div className="space-y-3">
              <ImageUpload
                value={fullMenuImageUrl}
                onChange={(url) => {
                  setFullMenuImageUrl(url)
                  saveFullMenu(showFullMenu, url)
                }}
                folder="full-menu"
              />
              {fullMenuImageUrl && (
                <p className="text-xs text-gray-500">
                  ✓ Image uploadée — visible sur votre page publique.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Gestion des catégories ── */}
      <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-brand-orange" />
            <h2 className="text-white font-semibold text-sm">Catégories</h2>
            <span className="text-gray-500 text-xs">({categories.length})</span>
          </div>
          <button onClick={() => setCatModal(true)} className="flex items-center gap-1.5 text-brand-orange hover:text-brand-orange-dark text-xs font-semibold transition-colors">
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
                      <input autoFocus value={editingCatName} onChange={e => setEditingCatName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEditCat(cat.id); if (e.key === 'Escape') setEditingCatId(null) }}
                        className="flex-1 bg-surface-50 border border-surface-300 rounded-lg px-3 py-1 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                      <button onClick={() => saveEditCat(cat.id)} disabled={catSaving} className="p-1.5 text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                      <button onClick={() => setEditingCatId(null)} className="p-1.5 text-gray-500 hover:text-white"><XIcon className="w-4 h-4" /></button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-white text-sm font-medium">{cat.name}</span>
                      <span className="text-gray-500 text-xs">{count} plat{count > 1 ? 's' : ''}</span>
                      <button onClick={() => { setEditingCatId(cat.id); setEditingCatName(cat.name) }} className="p-1.5 text-gray-500 hover:text-white"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteCategory(cat.id)} className="p-1.5 text-gray-500 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Liste plats ── */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <SkeletonRow key={i} />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon={<UtensilsCrossed className="w-7 h-7" />} title="Aucun plat dans le menu"
          description="Commencez par ajouter vos premiers plats." action={<Button onClick={openCreate}><PlusCircle className="w-4 h-4" /> Ajouter le premier plat</Button>} />
      ) : (
        <div className="space-y-2">
          {[{ id: null, name: 'Sans catégorie' }, ...categories].map(cat => {
            const catItems = cat.id === null ? items.filter(i => !i.category_id) : items.filter(i => i.category_id === cat.id)
            if (!catItems.length) return null
            return (
              <div key={cat.id ?? 'none'} className="mb-6">
                <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-2 px-1">{cat.name}</p>
                <div className="bg-surface-50 border border-surface-200 rounded-2xl overflow-hidden">
                  {catItems.map((item, idx) => (
                    <div key={item.id} className={`flex items-center gap-4 px-5 py-4 hover:bg-surface-100 transition-colors ${idx < catItems.length - 1 ? 'border-b border-surface-200' : ''}`}>
                      <div className="w-12 h-12 rounded-xl bg-surface-200 flex-shrink-0 overflow-hidden">
                        {item.image_url
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                          : <div className="w-full h-full flex items-center justify-center text-lg">🍽️</div>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-white text-sm font-semibold truncate">{item.name}</p>
                          {(item.variants ?? []).length > 0 && (
                            <span className="text-xs text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">{item.variants!.length} variantes</span>
                          )}
                        </div>
                        {item.description && <p className="text-gray-500 text-xs truncate">{item.description}</p>}
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <p className="text-brand-orange text-xs font-bold">{displayPrice(item)}</p>
                          {stockBadge(item)}
                          {preorderBadge(item)}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <button onClick={() => toggleAvailable(item)} className="text-gray-500 hover:text-brand-orange transition-colors">
                          {item.is_available ? <ToggleRight className="w-5 h-5 text-green-400" /> : <ToggleLeft className="w-5 h-5" />}
                        </button>
                        <Badge variant={item.is_available ? 'success' : 'warning'}>{item.is_available ? 'Dispo' : 'Indispo'}</Badge>
                        <button onClick={() => openEdit(item)} className="text-gray-500 hover:text-white transition-colors"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteItem(item.id)} className="text-gray-500 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal plat ── */}
      <Modal open={itemModal} onClose={() => setItemModal(false)} title={editingItem ? 'Modifier le plat' : 'Ajouter un plat'} size="md">
        <div className="space-y-4">
          {error && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{error}</div>}

          <MultiImageUpload
            values={imageUrls}
            onChange={setImageUrls}
            folder="menu"
            max={5}
          />
          <Input label="Nom du plat *" placeholder="Burger Teranga" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
          <Input label="Description" placeholder="Bœuf haché, oignons caramélisés..." value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />

          {/* Prix — caché si variantes actives */}
          {(!isPremium || variants.length === 0) && (
            <Input label="Prix (FCFA) *" placeholder="2500" type="number" value={form.price} onChange={e => setForm(p => ({ ...p, price: e.target.value }))} />
          )}

          <Select label="Catégorie" options={catOptions} value={form.category_id} onChange={e => setForm(p => ({ ...p, category_id: e.target.value }))} />

          <div className="flex items-center gap-3">
            <input type="checkbox" id="available" checked={form.is_available} onChange={e => setForm(p => ({ ...p, is_available: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
            <label htmlFor="available" className="text-gray-300 text-sm">Disponible à la commande</label>
          </div>

          {/* ── PREMIUM : Variantes ── */}
          {isPremium && (
            <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Crown className="w-4 h-4 text-purple-400" />
                <span className="text-sm font-semibold text-purple-400">Variantes</span>
                <span className="text-xs text-gray-500">Petit/Grand, Poulet/Viande…</span>
              </div>
              <div className="space-y-2 mb-3">
                {variants.map((v, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <input value={v.name} onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                      placeholder="Ex: Grand" className="flex-1 min-w-0 bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
                    <input value={v.price} onChange={e => setVariants(prev => prev.map((x, j) => j === i ? { ...x, price: e.target.value } : x))}
                      placeholder="Prix" type="number" className="w-20 flex-shrink-0 bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
                    <button onClick={() => setVariants(prev => prev.filter((_, j) => j !== i))} className="flex-shrink-0 p-2 text-gray-500 hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
              <button onClick={() => setVariants(prev => [...prev, { name: '', price: '' }])}
                className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 text-xs font-semibold transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Ajouter une variante
              </button>
              {variants.length > 0 && (
                <p className="text-xs text-gray-500 mt-2">Le prix affiché sera "À partir de {formatCurrency(Math.min(...variants.map(v => parseInt(v.price) || 0)))}"</p>
              )}
            </div>
          )}

          {/* ── PREMIUM : Stock ── */}
          {isPremium && (
            <div className="border border-surface-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input type="checkbox" id="stock" checked={stockEnabled} onChange={e => setStockEnabled(e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                <label htmlFor="stock" className="flex items-center gap-2 text-sm font-semibold text-gray-300 cursor-pointer">
                  <Package className="w-4 h-4 text-brand-orange" />
                  Activer la gestion de stock
                </label>
              </div>
              {stockEnabled && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Stock disponible</label>
                    <input value={stockQty} onChange={e => setStockQty(e.target.value)} type="number" placeholder="Ex: 50"
                      className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Alerte stock faible</label>
                    <input value={stockThreshold} onChange={e => setStockThreshold(e.target.value)} type="number" placeholder="Ex: 5"
                      className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PREMIUM : Précommandes ── */}
          {isPremium && (
            <div className="border border-surface-200 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <input type="checkbox" id="preorder" checked={preorderEnabled} onChange={e => setPreorderEnabled(e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                <label htmlFor="preorder" className="flex items-center gap-2 text-sm font-semibold text-gray-300 cursor-pointer">
                  <Clock className="w-4 h-4 text-blue-400" />
                  Produit en précommande
                </label>
              </div>
              {preorderEnabled && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Ouverture des commandes</label>
                      <input value={preorderOpenAt} onChange={e => setPreorderOpenAt(e.target.value)} type="datetime-local"
                        className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 block mb-1">Fermeture des commandes</label>
                      <input value={preorderCloseAt} onChange={e => setPreorderCloseAt(e.target.value)} type="datetime-local"
                        className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Date / heure de livraison (texte libre)</label>
                    <input value={preorderDelivery} onChange={e => setPreorderDelivery(e.target.value)} placeholder="Ex: Samedi 12h00"
                      className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-400 block mb-1">Quantité maximale</label>
                    <input value={preorderMaxQty} onChange={e => setPreorderMaxQty(e.target.value)} type="number" placeholder="Ex: 100"
                      className="w-full bg-surface-100 border border-surface-300 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
                  </div>
                  <div className="flex items-start gap-2 bg-blue-500/10 rounded-lg p-3">
                    <AlertTriangle className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blue-300">Le produit sera commandable uniquement entre les dates d'ouverture et fermeture. Un compte à rebours sera affiché sur votre site.</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── PREMIUM : Produit mis en avant ── */}
          {isPremium && (
            <div className="border border-surface-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 cursor-pointer">
                  <Crown className="w-4 h-4 text-yellow-400" />
                  Produit mis en avant
                </label>
                <button
                  type="button"
                  onClick={() => setIsFeatured(v => !v)}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isFeatured ? 'bg-brand-orange' : 'bg-surface-300'}`}
                >
                  <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isFeatured ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>
              {isFeatured && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-400 block mb-1.5">Badge d&apos;affichage</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Best Seller', 'Nouveau', 'Promotion', 'Recommandé'] as const).map(label => (
                        <button
                          key={label}
                          type="button"
                          onClick={() => setFeaturedLabel(featuredLabel === label ? null : label)}
                          className={`text-xs font-semibold py-2 px-3 rounded-lg border transition-colors ${
                            featuredLabel === label
                              ? 'bg-brand-orange/20 border-brand-orange text-brand-orange'
                              : 'bg-surface-100 border-surface-300 text-gray-400 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-gray-400">Épingler en tête de liste</label>
                    <button
                      type="button"
                      onClick={() => setIsPinned(v => !v)}
                      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${isPinned ? 'bg-brand-orange' : 'bg-surface-300'}`}
                    >
                      <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${isPinned ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bannière upgrade si pas Premium */}
          {!isPremium && (
            <div className="flex items-center gap-3 bg-purple-500/10 border border-purple-500/20 rounded-xl px-4 py-3">
              <Crown className="w-4 h-4 text-purple-400 flex-shrink-0" />
              <p className="text-xs text-purple-300">Les variantes, la gestion de stock et les précommandes sont disponibles avec le plan <strong>Premium</strong>.</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" fullWidth onClick={() => setItemModal(false)}>Annuler</Button>
            <Button fullWidth loading={saving} onClick={saveItem}>{editingItem ? 'Enregistrer' : 'Ajouter'}</Button>
          </div>
        </div>
      </Modal>

      {/* ── Modal catégorie ── */}
      <Modal open={catModal} onClose={() => setCatModal(false)} title="Nouvelle catégorie" size="sm">
        <div className="space-y-4">
          <Input label="Nom de la catégorie" placeholder="Burgers, Boissons, Desserts..." value={catName} onChange={e => setCatName(e.target.value)} />
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={() => setCatModal(false)}>Annuler</Button>
            <Button fullWidth loading={saving} onClick={saveCategory}>Créer</Button>
          </div>
        </div>
      </Modal>

    </div>
  )
}
