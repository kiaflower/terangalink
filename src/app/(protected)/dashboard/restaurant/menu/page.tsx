'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatPrice } from '@/lib/utils'
import { PLANS, canUseFeature, hasReachedProductLimit, productLimitMessage, type PlanKey } from '@/lib/plans'
import type { MenuCategory, ProductWithVariants } from '@/lib/types'
import { fileToCompressedBlob, fileToCroppedBlob } from '@/lib/imageUtils'
import { uploadWithProgress, validateVideoFile } from '@/lib/videoUtils'
import { Package, Trash2, Upload, X, ChevronUp, ChevronDown, Pin, Check, Info, Video } from 'lucide-react'
import Link from 'next/link'
import { FeatureGate } from '@/components/FeatureGate'

const ANNOUNCEMENT_RATIO = 3 / 1

interface VariantForm {
  id?: string
  name: string
  options: string[]
  option_prices: Record<string, number>
  option_images: Record<string, string>
}

interface ProductForm {
  name: string
  description: string
  price: string
  discount_percent: string
  category_id: string
  is_available: boolean
  track_stock: boolean
  stock_quantity: string
  images: string[]
  preorder_enabled: boolean
  preorder_start: string
  preorder_end: string
  preorder_delivery_date: string
  preorder_max_qty: string
  is_featured: boolean
  badge_text: string
  is_pinned: boolean
  video_url: string
}

const emptyForm: ProductForm = {
  name: '', description: '', price: '', discount_percent: '', category_id: '',
  is_available: true, track_stock: false, stock_quantity: '', images: [],
  preorder_enabled: false, preorder_start: '', preorder_end: '', preorder_delivery_date: '', preorder_max_qty: '',
  is_featured: false, badge_text: '', is_pinned: false, video_url: '',
}

const BADGE_PRESETS = ['Nouveau', 'Meilleure vente', 'Coup de cœur', 'Édition limitée', 'Promo']

export default function MenuPage() {
  const supabase = createClient()
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanKey>('starter')
  const [categories, setCategories] = useState<MenuCategory[]>([])
  const [products, setProducts] = useState<ProductWithVariants[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editProduct, setEditProduct] = useState<ProductWithVariants | null>(null)
  const [form, setForm] = useState<ProductForm>(emptyForm)
  const [variants, setVariants] = useState<VariantForm[]>([])
  // Un plat qui avait des variantes à l'ouverture de l'éditeur et qui les
  // perd toutes doit repasser par une confirmation explicite de prix de base
  // plutôt qu'une déduction silencieuse — voir applyVariantsChange.
  const [initialHadVariants, setInitialHadVariants] = useState(false)
  const [pendingVariants, setPendingVariants] = useState<VariantForm[] | null>(null)
  const [reactivationModalOpen, setReactivationModalOpen] = useState(false)
  const [reactivationPrice, setReactivationPrice] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadingVideo, setUploadingVideo] = useState(false)
  const [videoError, setVideoError] = useState('')
  const [catName, setCatName] = useState('')
  const [addingCat, setAddingCat] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  // Bannière d'annonce (validation panier, promo, événement...)
  const [announcementEnabled, setAnnouncementEnabled] = useState(false)
  const [announcementImageUrl, setAnnouncementImageUrl] = useState<string | null>(null)
  const [announcementTitle, setAnnouncementTitle] = useState('')
  const [uploadingAnnouncement, setUploadingAnnouncement] = useState(false)
  const [savingAnnouncement, setSavingAnnouncement] = useState(false)
  const [announcementSaved, setAnnouncementSaved] = useState(false)

  const maxImages = PLANS[plan].limits.images_per_product

  const load = useCallback(async (bid: string) => {
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from('menu_categories').select('*').eq('restaurant_id', bid).order('position'),
      supabase.from('menu_items').select('*, variants:menu_item_variants(*)').eq('restaurant_id', bid).order('is_pinned', { ascending: false }).order('position'),
    ])
    setCategories(cats ?? [])
    setProducts(prods ?? [])
  }, [supabase])

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      // Check impersonation cookie
      const res = await fetch('/api/auth/me')
      const data = await res.json()
      const bid = data.restaurant_id
      if (bid) {
        setRestaurantId(bid)
        load(bid)
        const { data: sub } = await supabase.from('subscriptions').select('plan').eq('restaurant_id', bid).single()
        if (sub?.plan === 'pro' || sub?.plan === 'free') setPlan(sub.plan)
        const { data: b } = await supabase.from('restaurants')
          .select('announcement_enabled, announcement_image_url, announcement_title').eq('id', bid).single()
        if (b) {
          setAnnouncementEnabled(!!b.announcement_enabled)
          setAnnouncementImageUrl(b.announcement_image_url)
          setAnnouncementTitle(b.announcement_title ?? '')
        }
      }
    })
  }, [supabase, load])

  async function uploadAnnouncementImage(file: File) {
    if (!restaurantId) return
    setUploadingAnnouncement(true)
    // Recadrage centré 3:1 automatique — la bannière s'affiche en pleine
    // largeur sur la vitrine, une photo au mauvais ratio y serait déformée.
    const cropped = await fileToCroppedBlob(file, ANNOUNCEMENT_RATIO)
    const path = `${restaurantId}/announcement-${Date.now()}-${cropped.name}`
    const { error } = await supabase.storage.from('restaurant-images').upload(path, cropped, { upsert: false })
    if (!error) {
      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(path)
      setAnnouncementImageUrl(data.publicUrl)
    }
    setUploadingAnnouncement(false)
  }

  async function saveAnnouncement() {
    if (!restaurantId) return
    setSavingAnnouncement(true)
    await supabase.from('restaurants').update({
      announcement_enabled: announcementEnabled,
      announcement_image_url: announcementImageUrl,
      announcement_title: announcementTitle || null,
    }).eq('id', restaurantId)
    setSavingAnnouncement(false)
    setAnnouncementSaved(true)
    setTimeout(() => setAnnouncementSaved(false), 2500)
  }

  // Vidéo optionnelle, en plus des photos — mêmes limites que les Stories
  // (20 Mo / 30s) pour rester léger en data mobile.
  async function handleVideoUpload(file: File) {
    if (!restaurantId) return
    setVideoError('')
    const error = await validateVideoFile(file)
    if (error) { setVideoError(error); return }
    setUploadingVideo(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      setVideoError('Session expirée, reconnectez-vous.')
      setUploadingVideo(false)
      return
    }
    const path = `${restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name}`
    const uploadedPath = await uploadWithProgress('product-videos', path, file, session.access_token, () => {})
    if (!uploadedPath) {
      setVideoError('Erreur lors de l\'envoi de la vidéo. Vérifiez votre connexion et réessayez.')
      setUploadingVideo(false)
      return
    }
    const { data: pub } = supabase.storage.from('product-videos').getPublicUrl(uploadedPath)
    setForm(f => ({ ...f, video_url: pub.publicUrl }))
    setUploadingVideo(false)
  }

  async function handleImageUpload(files: FileList | null) {
    if (!files || !files.length || !restaurantId) return
    setUploading(true)
    const uploaded: string[] = []
    for (const file of Array.from(files)) {
      if (form.images.length + uploaded.length >= maxImages) break
      const compressed = await fileToCompressedBlob(file, 1600)
      const path = `${restaurantId}/${Date.now()}-${Math.random().toString(36).slice(2)}-${compressed.name}`
      const { error } = await supabase.storage.from('product-images').upload(path, compressed, { upsert: false })
      if (!error) {
        const { data } = supabase.storage.from('product-images').getPublicUrl(path)
        uploaded.push(data.publicUrl)
      }
    }
    setForm(f => ({ ...f, images: [...f.images, ...uploaded].slice(0, maxImages) }))
    setUploading(false)
  }

  function removeImage(index: number) {
    setForm(f => ({ ...f, images: f.images.filter((_, i) => i !== index) }))
  }

  function addVariant() {
    setVariants(prev => [...prev, { name: '', options: [], option_prices: {}, option_images: {} }])
  }

  function isActiveVariant(v: VariantForm) {
    return !!v.name.trim() && v.options.length > 0
  }

  // Le prix de base réapparaît uniquement quand PLUS AUCUNE variante n'est
  // active. Si le plat avait déjà des variantes à l'ouverture de
  // l'éditeur, on ne déduit jamais silencieusement ce prix — on demande une
  // confirmation explicite (voir reactivationModalOpen) pour ne jamais
  // fixer un prix que le restaurateur n'a pas choisi lui-même.
  function applyVariantsChange(next: VariantForm[]) {
    const stillActive = next.some(isActiveVariant)
    const wasActive = variants.some(isActiveVariant)
    if (!stillActive && wasActive && initialHadVariants) {
      const firstVariant = variants.find(v => v.options.length > 0)
      const firstOption = firstVariant?.options[0]
      const suggested = firstOption != null ? firstVariant!.option_prices[firstOption] : undefined
      setReactivationPrice(suggested != null ? String(suggested) : form.price)
      setPendingVariants(next)
      setReactivationModalOpen(true)
      return
    }
    setVariants(next)
  }

  function confirmReactivation(price: string) {
    if (pendingVariants) setVariants(pendingVariants)
    setForm(f => ({ ...f, price }))
    setInitialHadVariants(false)
    setReactivationModalOpen(false)
    setPendingVariants(null)
  }

  function cancelReactivation() {
    setReactivationModalOpen(false)
    setPendingVariants(null)
  }

  function removeVariant(index: number) {
    applyVariantsChange(variants.filter((_, i) => i !== index))
  }

  function addVariantOption(variantIndex: number, option: string) {
    if (!option.trim()) return
    setVariants(prev => prev.map((v, i) => i === variantIndex ? { ...v, options: [...v.options, option.trim()] } : v))
  }

  function removeVariantOption(variantIndex: number, option: string) {
    applyVariantsChange(variants.map((v, i) => i === variantIndex
      ? {
          ...v,
          options: v.options.filter(o => o !== option),
          option_prices: Object.fromEntries(Object.entries(v.option_prices).filter(([k]) => k !== option)),
          option_images: Object.fromEntries(Object.entries(v.option_images).filter(([k]) => k !== option)),
        }
      : v))
  }

  function setVariantOptionPrice(variantIndex: number, option: string, price: string) {
    setVariants(prev => prev.map((v, i) => {
      if (i !== variantIndex) return v
      const next = { ...v.option_prices }
      if (price === '') delete next[option]
      else next[option] = parseFloat(price) || 0
      return { ...v, option_prices: next }
    }))
  }

  // Photo par option optionnelle : absente => la fiche retombe sur la photo
  // principale du plat. Même convention que les photos plat (compression
  // client-side + bucket product-images).
  async function uploadVariantOptionImage(variantIndex: number, option: string, file: File) {
    if (!restaurantId) return
    const compressed = await fileToCompressedBlob(file, 1600)
    const path = `${restaurantId}/variant-${Date.now()}-${Math.random().toString(36).slice(2)}-${compressed.name}`
    const { error } = await supabase.storage.from('product-images').upload(path, compressed, { upsert: false })
    if (error) return
    const { data } = supabase.storage.from('product-images').getPublicUrl(path)
    setVariants(prev => prev.map((v, i) => i === variantIndex
      ? { ...v, option_images: { ...v.option_images, [option]: data.publicUrl } }
      : v))
  }

  function removeVariantOptionImage(variantIndex: number, option: string) {
    setVariants(prev => prev.map((v, i) => i === variantIndex
      ? { ...v, option_images: Object.fromEntries(Object.entries(v.option_images).filter(([k]) => k !== option)) }
      : v))
  }

  async function saveProduct() {
    if (!restaurantId) return
    if (!editProduct && hasReachedProductLimit(plan, products.length)) {
      alert(productLimitMessage(plan))
      return
    }
    setSaving(true)
    const validVariants = variants.filter(isActiveVariant)
    const activeOptionPrices = validVariants.flatMap(v => v.options.map(opt => v.option_prices[opt]).filter((p): p is number => p != null))
    // Quand des variantes sont actives, le prix de base n'est jamais saisi
    // manuellement : on le déduit (prix le plus bas parmi les options) pour
    // qu'il reste une référence valide pour tout ce qui ignore les variantes
    // (cartes annuaire, JSON-LD) sans jamais être la source de vérité affichée.
    const computedPrice = activeOptionPrices.length > 0 ? Math.min(...activeOptionPrices) : (parseFloat(form.price) || 0)
    const payload = {
      restaurant_id: restaurantId,
      name: form.name,
      description: form.description || null,
      price: computedPrice,
      discount_percent: plan === 'pro' && form.discount_percent ? Math.min(100, Math.max(0, parseInt(form.discount_percent) || 0)) : null,
      category_id: form.category_id || null,
      is_available: form.is_available,
      track_stock: plan === 'pro' && form.track_stock,
      stock_quantity: plan === 'pro' && form.track_stock ? (parseInt(form.stock_quantity) || 0) : null,
      image_url: form.images[0] || null,
      images_urls: form.images,
      preorder_enabled: canUseFeature(plan, 'precommandes') && form.preorder_enabled,
      preorder_start: canUseFeature(plan, 'precommandes') && form.preorder_enabled && form.preorder_start ? new Date(form.preorder_start).toISOString() : null,
      preorder_end: canUseFeature(plan, 'precommandes') && form.preorder_enabled && form.preorder_end ? new Date(form.preorder_end).toISOString() : null,
      preorder_delivery_date: canUseFeature(plan, 'precommandes') && form.preorder_enabled ? (form.preorder_delivery_date || null) : null,
      preorder_max_qty: canUseFeature(plan, 'precommandes') && form.preorder_enabled && form.preorder_max_qty ? parseInt(form.preorder_max_qty) || null : null,
      is_featured: form.is_featured,
      badge_text: form.is_featured ? (form.badge_text.trim() || null) : null,
      is_pinned: canUseFeature(plan, 'epinglagePlats') && form.is_pinned,
      video_url: form.video_url || null,
    }
    let productId = editProduct?.id
    let saveError: { message: string } | null = null
    if (editProduct) {
      const { error } = await supabase.from('menu_items').update(payload).eq('id', editProduct.id)
      saveError = error
    } else {
      const { data: inserted, error } = await supabase.from('menu_items').insert(payload).select('id').single()
      productId = inserted?.id
      saveError = error
    }

    if (saveError) {
      alert(saveError.message)
      setSaving(false)
      return
    }

    if (productId && plan === 'pro') {
      await supabase.from('menu_item_variants').delete().eq('menu_item_id', productId)
      if (validVariants.length > 0) {
        await supabase.from('menu_item_variants').insert(
          validVariants.map(v => ({ menu_item_id: productId, name: v.name, options: v.options, option_prices: v.option_prices, option_images: v.option_images }))
        )
      }
    }

    await load(restaurantId)
    setModalOpen(false)
    setEditProduct(null)
    setForm(emptyForm)
    setVariants([])
    setInitialHadVariants(false)
    setSaving(false)
  }

  async function deleteProduct(id: string) {
    if (!restaurantId || !confirm('Supprimer ce plat ?')) return
    await supabase.from('menu_items').delete().eq('id', id)
    await load(restaurantId)
  }

  async function addCategory() {
    if (!restaurantId || !catName.trim()) return
    setAddingCat(true)
    await supabase.from('menu_categories').insert({ restaurant_id: restaurantId, name: catName.trim(), position: categories.length })
    await load(restaurantId)
    setCatName('')
    setAddingCat(false)
  }

  async function moveCategory(id: string, direction: -1 | 1) {
    if (!restaurantId) return
    const idx = categories.findIndex(c => c.id === id)
    const swapIdx = idx + direction
    if (idx === -1 || swapIdx < 0 || swapIdx >= categories.length) return
    const a = categories[idx]
    const b = categories[swapIdx]
    await Promise.all([
      supabase.from('menu_categories').update({ position: b.position }).eq('id', a.id),
      supabase.from('menu_categories').update({ position: a.position }).eq('id', b.id),
    ])
    await load(restaurantId)
  }

  async function deleteCategory(id: string) {
    if (!restaurantId || !confirm('Supprimer cette catégorie ? Les plats associés deviendront "Sans catégorie".')) return
    await supabase.from('menu_items').update({ category_id: null }).eq('category_id', id)
    await supabase.from('menu_categories').delete().eq('id', id)
    if (activeCategory === id) setActiveCategory(null)
    await load(restaurantId)
  }

  const filtered = activeCategory ? products.filter(p => p.category_id === activeCategory) : products
  const otherPinnedCount = products.filter(p => p.is_pinned && p.id !== editProduct?.id).length
  const limitReached = hasReachedProductLimit(plan, products.length)
  const hasActiveVariants = variants.some(isActiveVariant)
  const variantsMissingPrice = hasActiveVariants && variants.some(v => isActiveVariant(v) && v.options.some(opt => v.option_prices[opt] == null))

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Menu</h1>
        <button
          onClick={() => {
            if (limitReached) { alert(productLimitMessage(plan)); return }
            setEditProduct(null); setForm(emptyForm); setVariants([]); setInitialHadVariants(false); setModalOpen(true)
          }}
          className="bg-brand-orange text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-brand-orange-dark transition-colors"
        >
          + Ajouter un plat
        </button>
      </div>

      {limitReached && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center justify-between gap-4 flex-wrap">
          <p className="text-sm text-amber-800">{productLimitMessage(plan)}</p>
          <Link href="/dashboard/restaurant/settings#abonnement"
            className="text-sm font-semibold text-amber-900 underline underline-offset-2 whitespace-nowrap">
            Changer de plan
          </Link>
        </div>
      )}

      {/* Bannière d'annonce (validation panier, promo, événement...) */}
      <div className="mb-6">
      <FeatureGate plan={plan} feature="annonce" requiredPlanLabel="Starter"
        description="Affichez une bannière d'annonce sous le bandeau d'accueil de votre vitrine (validation de panier, promo, événement...).">
      <div className="bg-white border border-gray-200 rounded-2xl p-4">
        <h2 className="text-sm font-medium text-gray-400 mb-1">Annonce</h2>
        <p className="text-xs text-gray-400 mb-3">
          Affiche une bannière sous le bandeau d&apos;accueil de la vitrine, avant les catégories. Utile pour mettre
          en avant une offre spéciale (validation de panier, promo, événement...).
        </p>
        <div className="flex items-center gap-3 mb-4">
          <input
            type="checkbox"
            id="announcement_enabled"
            checked={announcementEnabled}
            onChange={e => setAnnouncementEnabled(e.target.checked)}
            className="w-4 h-4 accent-brand-orange"
          />
          <label htmlFor="announcement_enabled" className="text-sm text-gray-500">Activer la bannière d&apos;annonce</label>
        </div>
        <div className="space-y-2 mb-4">
          {announcementImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={announcementImageUrl} alt="" className="w-full aspect-[3/1] rounded-xl object-cover border border-gray-200" />
          ) : (
            <div className="w-full aspect-[3/1] rounded-xl bg-gray-50 flex items-center justify-center text-gray-300 text-xs text-center px-4">
              Bannière (format paysage 3:1, ex: 1200x400px)
            </div>
          )}
          <label className="inline-flex items-center gap-2 text-sm border border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-brand-orange text-gray-600 hover:text-brand-orange transition-colors">
            <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadAnnouncementImage(e.target.files[0])} />
            <Upload className="w-4 h-4" />
            {uploadingAnnouncement ? 'Envoi…' : 'Changer la bannière'}
          </label>
          <p className="text-[11px] text-gray-400">L&apos;image est automatiquement recadrée au centre au format 3:1.</p>
        </div>
        <div className="mb-4">
          <label className="text-xs text-gray-400 mb-1 block">Titre de l&apos;annonce (optionnel)</label>
          <input
            type="text"
            value={announcementTitle}
            onChange={e => setAnnouncementTitle(e.target.value)}
            placeholder="Ex: Validation panier Shein"
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
          />
          <p className="text-[11px] text-gray-400 mt-1">
            Personnalise le message WhatsApp pré-rempli quand un client clique sur &quot;Obtenir plus d&apos;infos&quot;.
            Laissez vide pour un message générique.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={saveAnnouncement}
            disabled={savingAnnouncement}
            className="bg-brand-orange text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
          >
            {savingAnnouncement ? 'Enregistrement…' : "Enregistrer l'annonce"}
          </button>
          {announcementSaved && <span className="text-xs text-green-600 flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Enregistré</span>}
        </div>
      </div>
      </FeatureGate>
      </div>

      {/* Categories */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
        <h2 className="text-sm font-medium text-gray-400 mb-3">Catégories</h2>
        <div className="flex gap-2 flex-wrap mb-3">
          <button
            onClick={() => setActiveCategory(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${!activeCategory ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
          >
            Tous ({products.length})
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${activeCategory === cat.id ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
            >
              {cat.name} ({products.filter(p => p.category_id === cat.id).length})
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={catName}
            onChange={e => setCatName(e.target.value)}
            placeholder="Nouvelle catégorie..."
            className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:border-brand-orange"
          />
          <button
            onClick={addCategory}
            disabled={addingCat || !catName.trim()}
            className="bg-brand-orange text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
          >
            Ajouter
          </button>
        </div>

        {categories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 space-y-1.5">
            <p className="text-xs text-gray-400 mb-2">Réorganiser ou supprimer</p>
            {categories.map((cat, i) => (
              <div key={cat.id} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                <span className="flex-1 text-sm text-gray-700 truncate">{cat.name}</span>
                <button type="button" onClick={() => moveCategory(cat.id, -1)} disabled={i === 0}
                  className="p-1 text-gray-400 hover:text-brand-orange disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => moveCategory(cat.id, 1)} disabled={i === categories.length - 1}
                  className="p-1 text-gray-400 hover:text-brand-orange disabled:opacity-30 disabled:hover:text-gray-400 transition-colors">
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button type="button" onClick={() => deleteCategory(cat.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Products */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Package className="w-10 h-10 mx-auto mb-4 text-gray-600" />
          <p>Aucun plat. Ajoutez votre premier plat !</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(product => (
            <div key={product.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
              {product.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={product.image_url} alt={product.name} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 bg-gray-50 flex items-center justify-center"><Package className="w-10 h-10 text-gray-300" /></div>
              )}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-gray-900 text-sm">{product.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${product.is_available ? 'bg-green-500/10 text-green-400' : 'bg-gray-500/10 text-gray-400'}`}>
                    {product.is_available ? 'Actif' : 'Inactif'}
                  </span>
                </div>
                {product.is_pinned && (
                  <span className="inline-flex items-center gap-1 mt-1.5 mr-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                    <Pin className="w-2.5 h-2.5" />
                    Épinglé
                  </span>
                )}
                {product.is_featured && product.badge_text && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-brand-orange text-white">
                    {product.badge_text}
                  </span>
                )}
                {product.discount_percent ? (
                  <p className="mt-2 flex items-center gap-2">
                    <span className="text-xs text-gray-400 line-through">{formatPrice(product.price)}</span>
                    <span className="text-brand-orange-light font-bold">{formatPrice(Math.round(product.price * (1 - product.discount_percent / 100)))}</span>
                    <span className="text-xs font-semibold text-green-600">-{product.discount_percent}%</span>
                  </p>
                ) : (
                  <p className="text-brand-orange-light font-bold mt-2">{formatPrice(product.price)}</p>
                )}
                {product.track_stock && product.stock_quantity !== null && (
                  product.stock_quantity === 0 ? (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">Épuisé</span>
                  ) : product.stock_quantity <= 5 ? (
                    <span className="inline-block mt-2 text-xs px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-400">Stock faible ({product.stock_quantity})</span>
                  ) : null
                )}
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => {
                      setEditProduct(product)
                      setForm({
                        name: product.name,
                        description: product.description ?? '',
                        price: String(product.price),
                        discount_percent: product.discount_percent != null ? String(product.discount_percent) : '',
                        category_id: product.category_id ?? '',
                        is_available: product.is_available,
                        track_stock: product.track_stock,
                        stock_quantity: product.stock_quantity != null ? String(product.stock_quantity) : '',
                        images: product.images_urls?.length ? product.images_urls : (product.image_url ? [product.image_url] : []),
                        preorder_enabled: product.preorder_enabled,
                        preorder_start: product.preorder_start ? product.preorder_start.slice(0, 16) : '',
                        preorder_end: product.preorder_end ? product.preorder_end.slice(0, 16) : '',
                        preorder_delivery_date: product.preorder_delivery_date ?? '',
                        preorder_max_qty: product.preorder_max_qty != null ? String(product.preorder_max_qty) : '',
                        is_featured: product.is_featured,
                        badge_text: product.badge_text ?? '',
                        is_pinned: product.is_pinned,
                        video_url: product.video_url ?? '',
                      })
                      setVariants((product.variants ?? []).map(v => ({ id: v.id, name: v.name, options: v.options, option_prices: v.option_prices ?? {}, option_images: v.option_images ?? {} })))
                      setInitialHadVariants((product.variants ?? []).some(v => v.options.length > 0))
                      setModalOpen(true)
                    }}
                    className="flex-1 text-sm border border-gray-200 text-gray-400 py-2 rounded-lg hover:border-brand-orange hover:text-brand-orange-light transition-colors"
                  >
                    Modifier
                  </button>
                  <button
                    onClick={() => deleteProduct(product.id)}
                    className="text-sm border border-gray-200 text-red-400 px-3 py-2 rounded-lg hover:border-red-500/30 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Product modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="bg-white border border-gray-200 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-6">
              {editProduct ? 'Modifier le plat' : 'Nouveau plat'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Nom *</label>
                <input
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Description</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  rows={3}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange resize-none"
                />
              </div>
              {!hasActiveVariants ? (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Prix (FCFA) *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
                  />
                </div>
              ) : (
                <div className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <p className="text-xs text-gray-500">
                    Prix géré par variante — pas de prix de base tant que des variantes sont actives, voir la section « Variantes » ci-dessous.
                  </p>
                </div>
              )}
              {plan === 'pro' && (
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Réduction (%) — optionnel</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={form.discount_percent}
                    onChange={e => setForm(f => ({ ...f, discount_percent: e.target.value }))}
                    placeholder="Ex: 15"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Différent des codes promo : cette réduction s&apos;applique automatiquement à ce plat, sans code.</p>
                </div>
              )}
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Catégorie</label>
                <select
                  value={form.category_id}
                  onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))}
                  className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
                >
                  <option value="">Sans catégorie</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">
                  Photos {plan === 'pro' ? `(jusqu'à ${maxImages})` : '(1 photo — passez en Pro pour plusieurs photos)'}
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.images.map((url, i) => (
                    <div key={url} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeImage(i)}
                        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  {form.images.length < maxImages && (
                    <label className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-orange text-gray-400 hover:text-brand-orange transition-colors">
                      <input type="file" accept="image/*" multiple={plan === 'pro'} className="hidden"
                        onChange={e => handleImageUpload(e.target.files)} />
                      <Upload className="w-5 h-5" />
                    </label>
                  )}
                </div>
                {uploading && <p className="text-xs text-gray-400">Envoi en cours…</p>}
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Vidéo (optionnel, max 30s / 20 Mo)</label>
                {form.video_url ? (
                  <div className="flex items-center gap-2">
                    <video src={form.video_url} className="w-16 h-16 rounded-lg object-cover border border-gray-200" muted />
                    <button type="button" onClick={() => setForm(f => ({ ...f, video_url: '' }))}
                      className="text-xs text-red-400 hover:text-red-600">Retirer</button>
                  </div>
                ) : (
                  <label className="w-16 h-16 rounded-lg border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-orange text-gray-400 hover:text-brand-orange transition-colors">
                    <input type="file" accept="video/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleVideoUpload(f) }} />
                    <Video className="w-5 h-5" />
                  </label>
                )}
                {uploadingVideo && <p className="text-xs text-gray-400 mt-1">Envoi de la vidéo en cours…</p>}
                {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={form.is_available}
                  onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))}
                  className="w-4 h-4 accent-brand-orange"
                />
                <label htmlFor="is_available" className="text-sm text-gray-400">Disponible</label>
              </div>
              {plan === 'pro' ? (
                <>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="track_stock"
                      checked={form.track_stock}
                      onChange={e => setForm(f => ({ ...f, track_stock: e.target.checked }))}
                      className="w-4 h-4 accent-brand-orange"
                    />
                    <label htmlFor="track_stock" className="text-sm text-gray-400">Suivre le stock</label>
                  </div>
                  {form.track_stock && (
                    <div>
                      <label className="text-xs text-gray-400 mb-1 block">Quantité en stock</label>
                      <input
                        type="number"
                        min={0}
                        value={form.stock_quantity}
                        onChange={e => setForm(f => ({ ...f, stock_quantity: e.target.value }))}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
                      />
                    </div>
                  )}
                </>
              ) : (
                <p className="text-xs text-gray-400">
                  La gestion de stock est disponible avec le plan Pro.
                </p>
              )}
              {plan === 'pro' ? (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700">Variantes (taille, couleur…)</p>
                    <button type="button" onClick={addVariant} className="text-xs text-brand-orange font-semibold hover:underline">
                      + Ajouter une variante
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-500 mb-3 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-2.5 py-2">
                    <Info className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-500" />
                    <span>Le prix est obligatoire pour chaque option — il n&apos;y a plus de prix de base une fois des variantes actives, pour éviter toute ambiguïté sur le prix qui prime.</span>
                  </p>
                  {variants.map((variant, vi) => (
                    <div key={vi} className="mb-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          placeholder="Nom (ex: Taille)"
                          value={variant.name}
                          onChange={e => setVariants(prev => prev.map((v, i) => i === vi ? { ...v, name: e.target.value } : v))}
                          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900"
                        />
                        <button type="button" onClick={() => removeVariant(vi)} className="text-red-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-1.5 mb-2">
                        {variant.options.map(opt => {
                          const missingPrice = variant.option_prices[opt] == null
                          const optionImage = variant.option_images[opt]
                          return (
                            <div key={opt} className="flex items-center gap-2">
                              <span className="text-xs bg-white border border-gray-200 rounded-full px-2.5 py-1 flex-1">{opt}</span>
                              <input
                                type="number"
                                placeholder="Prix *"
                                value={variant.option_prices[opt] ?? ''}
                                onChange={e => setVariantOptionPrice(vi, opt, e.target.value)}
                                className={`w-28 border rounded-lg px-2 py-1 text-xs text-gray-900 ${missingPrice ? 'border-red-300 bg-red-50' : 'border-gray-200'}`}
                              />
                              {optionImage ? (
                                <div className="relative w-8 h-8 rounded-md overflow-hidden border border-gray-200 flex-shrink-0">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={optionImage} alt="" className="w-full h-full object-cover" />
                                  <button type="button" onClick={() => removeVariantOptionImage(vi, opt)}
                                    className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <label className="w-8 h-8 rounded-md border border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-brand-orange text-gray-400 hover:text-brand-orange transition-colors flex-shrink-0"
                                  title="Photo de cette option (optionnel)">
                                  <input type="file" accept="image/*" className="hidden"
                                    onChange={e => { const f = e.target.files?.[0]; if (f) uploadVariantOptionImage(vi, opt, f) }} />
                                  <Upload className="w-3.5 h-3.5" />
                                </label>
                              )}
                              <button type="button" onClick={() => removeVariantOption(vi, opt)} className="text-gray-400 hover:text-red-500 text-sm">×</button>
                            </div>
                          )
                        })}
                      </div>
                      <input
                        placeholder="Ajouter une option (ex: M) puis Entrée"
                        onKeyDown={e => {
                          if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                            addVariantOption(vi, e.currentTarget.value.trim())
                            e.currentTarget.value = ''
                            e.preventDefault()
                          }
                        }}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900"
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
                  Les variantes plat (taille, couleur, prix par option…) sont disponibles avec le plan Pro.
                </p>
              )}

              {canUseFeature(plan, 'precommandes') ? (
                <div className="border-t border-gray-100 pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="text-sm font-medium text-gray-700">Activer les précommandes</p>
                      <p className="text-xs text-gray-400">Permettre aux clients de commander avant la disponibilité</p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form.preorder_enabled}
                      onClick={() => setForm(f => ({ ...f, preorder_enabled: !f.preorder_enabled }))}
                      className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                      style={{ backgroundColor: form.preorder_enabled ? '#F97316' : '#E5E7EB' }}
                    >
                      <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                        style={{ transform: form.preorder_enabled ? 'translateX(22px)' : 'translateX(2px)' }} />
                    </button>
                  </div>

                  {form.preorder_enabled && (
                    <div className="space-y-3 mt-3">
                      <div>
                        <label className="text-xs font-medium text-gray-600">Ouverture des commandes</label>
                        <input type="datetime-local" value={form.preorder_start}
                          onChange={e => setForm(f => ({ ...f, preorder_start: e.target.value }))}
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Fermeture des commandes</label>
                        <input type="datetime-local" value={form.preorder_end}
                          onChange={e => setForm(f => ({ ...f, preorder_end: e.target.value }))}
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Date/heure de livraison</label>
                        <input type="text" value={form.preorder_delivery_date}
                          onChange={e => setForm(f => ({ ...f, preorder_delivery_date: e.target.value }))}
                          placeholder="Ex: Samedi 12 juillet à 14h"
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-gray-600">Quantité maximum</label>
                        <input type="number" value={form.preorder_max_qty}
                          onChange={e => setForm(f => ({ ...f, preorder_max_qty: e.target.value }))}
                          placeholder="Laisser vide pour illimité"
                          className="w-full mt-1 border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-xs text-gray-400 border-t border-gray-100 pt-4">
                  Les précommandes sont disponibles avec le plan Pro.
                </p>
              )}

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center gap-3 mb-3">
                  <input
                    type="checkbox"
                    id="is_featured"
                    checked={form.is_featured}
                    onChange={e => setForm(f => ({ ...f, is_featured: e.target.checked }))}
                    className="w-4 h-4 accent-brand-orange"
                  />
                  <label htmlFor="is_featured" className="text-sm font-medium text-gray-700">Mettre en avant sur le restaurant</label>
                </div>
                {form.is_featured && (
                  <div>
                    <label className="text-xs text-gray-400 mb-1.5 block">Texte du badge</label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {BADGE_PRESETS.map(preset => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => setForm(f => ({ ...f, badge_text: preset }))}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${form.badge_text === preset ? 'bg-brand-orange text-white border-brand-orange' : 'border-gray-200 text-gray-500 hover:border-brand-orange'}`}
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                    <input
                      value={form.badge_text}
                      onChange={e => setForm(f => ({ ...f, badge_text: e.target.value }))}
                      placeholder="Ex: Nouveau"
                      maxLength={20}
                      className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
                    />
                  </div>
                )}
              </div>

              <div className="border-t border-gray-100 pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <label htmlFor="is_pinned" className="text-sm font-medium text-gray-700">Épingler en première position</label>
                    <p className="text-xs text-gray-400 mt-0.5">Ce plat apparaîtra en tout premier sur la vitrine. 2 plats épinglés maximum.</p>
                  </div>
                  {canUseFeature(plan, 'epinglagePlats') && (
                    <input
                      type="checkbox"
                      id="is_pinned"
                      checked={form.is_pinned}
                      disabled={!form.is_pinned && otherPinnedCount >= 2}
                      onChange={e => setForm(f => ({ ...f, is_pinned: e.target.checked }))}
                      className="w-4 h-4 accent-brand-orange shrink-0 disabled:opacity-40"
                    />
                  )}
                </div>
                {canUseFeature(plan, 'epinglagePlats') ? (
                  !form.is_pinned && otherPinnedCount >= 2 && (
                    <p className="text-xs text-amber-600 mt-2">Limite de 2 plats épinglés atteinte. Désépinglez-en un pour en épingler un autre.</p>
                  )
                ) : (
                  <p className="text-xs text-gray-400 mt-2">L&apos;épinglage de plats est disponible avec le plan Pro.</p>
                )}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setModalOpen(false); setEditProduct(null); setForm(emptyForm); setVariants([]); setInitialHadVariants(false) }}
                className="flex-1 border border-gray-200 text-gray-400 py-3 rounded-xl text-sm hover:border-gray-500 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveProduct}
                disabled={saving || !form.name || (!hasActiveVariants && !form.price) || variantsMissingPrice}
                className="flex-1 bg-brand-orange text-white py-3 rounded-xl text-sm font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
              >
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
      {reactivationModalOpen && (
        <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full">
            <h3 className="font-bold text-gray-900 mb-2">Confirmer le prix de base</h3>
            <p className="text-sm text-gray-500 mb-4">
              Ce plat n&apos;a plus de variantes. Confirmez le prix de base à utiliser désormais.
            </p>
            <label className="text-xs text-gray-400 mb-1 block">Prix (FCFA) *</label>
            <input
              type="number"
              value={reactivationPrice}
              onChange={e => setReactivationPrice(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={cancelReactivation}
                className="flex-1 border border-gray-200 text-gray-400 py-2.5 rounded-xl text-sm hover:border-gray-500 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => confirmReactivation(reactivationPrice)}
                disabled={!reactivationPrice}
                className="flex-1 bg-brand-orange text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
