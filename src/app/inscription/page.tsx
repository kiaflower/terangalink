'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CUISINE_OPTIONS } from '@/lib/cuisines'
import {
  ArrowLeft, ArrowRight, Check, Upload, X,
  Zap, Store, UtensilsCrossed,
  MapPin, Camera, Share2, CreditCard, MessageSquare, ClipboardCheck,
  Calendar, MessageCircle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  ownerName: string; restaurantName: string; email: string
  whatsapp: string
  cuisineType: string; description: string
  address: string; city: string; neighborhood: string; googleMapsUrl: string
  openingHours: Record<string, { ouverture: string; fermeture: string; ferme: boolean }>
  logoUrl: string | null; bannerUrl: string | null; menuImageUrl: string | null; productPhotos: string[]
  facebookUrl: string; instagramUrl: string; tiktokUrl: string; snapchatUrl: string
  selectedPlan: 'starter' | 'pro' | 'premium'
  colorChoice: 'terangalink' | 'custom'
  primaryColor: string; secondaryColor: string
  allowSocialMedia: boolean; allowPhotos: boolean; allowPromoOffer: boolean
  promoOfferType: string; promoOfferCustom: string
}

// ─── Composants UI stables (hors composant principal) ────────────────────────

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: '#374151' }}>{label}</label>
      {children}
      {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
    </div>
  )
}

function TInput({
  value, onChange, placeholder, type = 'text', error, disabled,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; error?: string; disabled?: boolean
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-40"
      style={{ border: `1px solid ${error ? '#EF4444' : '#E5E7EB'}`, backgroundColor: '#F9FAFB', color: '#111111' }}
    />
  )
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const JOURS = [
  { key: 'lundi', label: 'Lundi' }, { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' }, { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' }, { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
]

const PLANS = [
  { id: 'starter' as const, name: 'Starter', price: '9 000', description: "L'essentiel pour démarrer", popular: false,
    features: ["Listé dans l'annuaire TerangaLink", 'Site de commande', 'Menu illimité', 'Commandes WhatsApp', 'Dashboard administrateur', 'QR Code'] },
  { id: 'pro' as const, name: 'Pro', price: '15 000', description: 'Personnalisation avancée', popular: true,
    features: ['Tout Starter', "Mise en avant dans l'annuaire", 'Branding TerangaLink supprimé', 'Couleurs personnalisées', 'Réseaux sociaux affichés', 'Support prioritaire'] },
  { id: 'premium' as const, name: 'Premium', price: '25 000', description: 'E-commerce avancé', popular: false,
    features: ['Tout Pro', 'Variantes de produits', 'Gestion de stock', 'Précommandes', 'Codes promo clients', 'Bannières promotionnelles'] },
]

const STEPS = [
  { label: 'Compte', icon: Store },
  { label: 'Restaurant', icon: UtensilsCrossed },
  { label: 'Localisation', icon: MapPin },
  { label: 'Visuels', icon: Camera },
  { label: 'Réseaux', icon: Share2 },
  { label: 'Abonnement', icon: CreditCard },
  { label: 'Communication', icon: MessageSquare },
  { label: 'Validation', icon: ClipboardCheck },
]

const COLOR_PALETTES = [
  { name: 'Teranga Orange', primary: '#F97316', secondary: '#FED7AA' },
  { name: 'Vert Savane', primary: '#16A34A', secondary: '#BBF7D0' },
  { name: 'Bleu Océan', primary: '#2563EB', secondary: '#BFDBFE' },
  { name: 'Violet Royal', primary: '#7C3AED', secondary: '#DDD6FE' },
  { name: 'Rouge Passion', primary: '#DC2626', secondary: '#FECACA' },
  { name: 'Or Sénégal', primary: '#D97706', secondary: '#FDE68A' },
]

const INITIAL: FormData = {
  ownerName: '', restaurantName: '', email: '', whatsapp: '',
  cuisineType: '', description: '',
  address: '', city: '', neighborhood: '', googleMapsUrl: '',
  openingHours: Object.fromEntries(JOURS.map(j => [j.key, { ouverture: '08:00', fermeture: '22:00', ferme: false }])),
  logoUrl: null, bannerUrl: null, menuImageUrl: null, productPhotos: [],
  facebookUrl: '', instagramUrl: '', tiktokUrl: '', snapchatUrl: '',
  selectedPlan: 'starter',
  colorChoice: 'terangalink',
  primaryColor: '#F97316', secondaryColor: '#FED7AA',
  allowSocialMedia: false, allowPhotos: false, allowPromoOffer: false,
  promoOfferType: '', promoOfferCustom: '',
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(supabase: ReturnType<typeof createClient>, file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(data.path)
  return publicUrl
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function InscriptionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLInputElement>(null)
  const photosRef = useRef<HTMLInputElement>(null)

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!form.ownerName.trim()) e.ownerName = 'Requis'
      if (!form.restaurantName.trim()) e.restaurantName = 'Requis'
      if (!form.email.trim() || !/\S+@\S+\.\S+/.test(form.email)) e.email = 'Email invalide'
      if (!form.whatsapp.trim()) e.whatsapp = 'Requis'
    }
    if (step === 2 && !form.cuisineType) e.cuisineType = 'Requis'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (validate()) setStep(s => Math.min(s + 1, 8)) }
  function prev() { setStep(s => Math.max(s - 1, 1)) }

  async function handleUpload(field: 'logoUrl' | 'bannerUrl' | 'menuImageUrl', file: File) {
    setUploading(field)
    const path = `inscriptions/${Date.now()}-${file.name}`
    const url = await uploadFile(supabase, file, path)
    if (url) set(field, url)
    setUploading(null)
  }

  async function handlePhotosUpload(files: FileList) {
    setUploading('photos')
    const urls: string[] = []
    for (const file of Array.from(files)) {
      const url = await uploadFile(supabase, file, `inscriptions/${Date.now()}-${file.name}`)
      if (url) urls.push(url)
    }
    set('productPhotos', [...form.productPhotos, ...urls])
    setUploading(null)
  }

  async function handleSubmit() {
    setSubmitting(true)
    const { data, error } = await supabase.from('restaurant_applications').insert({
      owner_name: form.ownerName, restaurant_name: form.restaurantName,
      email: form.email, whatsapp: form.whatsapp,
      cuisine_type: form.cuisineType || null, description: form.description || null,
      address: form.address || null, city: form.city || null, neighborhood: form.neighborhood || null,
      google_maps_url: form.googleMapsUrl || null, opening_hours: form.openingHours,
      logo_url: form.logoUrl, banner_url: form.bannerUrl,
      menu_image_url: form.menuImageUrl, product_photos: form.productPhotos,
      facebook_url: form.facebookUrl || null, instagram_url: form.instagramUrl || null,
      tiktok_url: form.tiktokUrl || null, snapchat_url: form.snapchatUrl || null,
      selected_plan: form.selectedPlan,
      color_choice: (form.selectedPlan === 'pro' || form.selectedPlan === 'premium') ? form.colorChoice : null,
      primary_color: (form.selectedPlan === 'pro' || form.selectedPlan === 'premium') && form.colorChoice === 'custom' ? form.primaryColor : null,
      secondary_color: (form.selectedPlan === 'pro' || form.selectedPlan === 'premium') && form.colorChoice === 'custom' ? form.secondaryColor : null,
      allow_social_media: form.allowSocialMedia, allow_photos: form.allowPhotos,
      allow_promo_offer: form.allowPromoOffer,
      promo_offer_type: form.allowPromoOffer ? form.promoOfferType : null,
      promo_offer_custom: form.promoOfferType === 'custom' ? form.promoOfferCustom : null,
      status: 'pending',
    }).select('id').single()
    setSubmitting(false)
    if (error) { alert("Erreur lors de l'envoi. Réessayez."); console.error(error); return }
    if (data?.id) sessionStorage.setItem('tl_application_id', data.id)
    router.push('/inscription/merci')
  }

  // ─── Rendu étapes ─────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      // ── Étape 1 : Compte ──────────────────────────────────────────────────
      case 1: return (
        <div className="space-y-4">
          <Field label="Votre nom" error={errors.ownerName}>
            <TInput value={form.ownerName} onChange={v => set('ownerName', v)} placeholder="Fatou Diallo" error={errors.ownerName} />
          </Field>
          <Field label="Nom du restaurant" error={errors.restaurantName}>
            <TInput value={form.restaurantName} onChange={v => set('restaurantName', v)} placeholder="Chez Teranga" error={errors.restaurantName} />
          </Field>
          <Field label="Email" error={errors.email}>
            <TInput value={form.email} onChange={v => set('email', v)} type="email" placeholder="contact@chezteranga.sn" error={errors.email} />
          </Field>
          <Field label="WhatsApp" error={errors.whatsapp}>
            <TInput value={form.whatsapp} onChange={v => set('whatsapp', v)} placeholder="221771234567" error={errors.whatsapp} />
          </Field>
        </div>
      )

      // ── Étape 2 : Restaurant ──────────────────────────────────────────────
      case 2: return (
        <div className="space-y-4">
          <Field label="Type de cuisine" error={errors.cuisineType}>
            <select
              value={form.cuisineType}
              onChange={e => set('cuisineType', e.target.value)}
              className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 appearance-none"
              style={{ border: `1px solid ${errors.cuisineType ? '#EF4444' : '#E5E7EB'}`, backgroundColor: '#F9FAFB', color: '#111111' }}
            >
              {CUISINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </Field>
          <Field label="Description (optionnel)">
            <textarea
              value={form.description}
              onChange={e => set('description', e.target.value)}
              rows={4}
              placeholder="Décrivez votre restaurant, votre cuisine, votre ambiance..."
              className="w-full px-4 py-3 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
              style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
            />
          </Field>
        </div>
      )

      // ── Étape 3 : Localisation & Horaires ─────────────────────────────────
      case 3: return (
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ville (optionnel)">
              <TInput value={form.city} onChange={v => set('city', v)} placeholder="Dakar" />
            </Field>
            <Field label="Quartier (optionnel)">
              <TInput value={form.neighborhood} onChange={v => set('neighborhood', v)} placeholder="Castors" />
            </Field>
          </div>
          <Field label="Adresse (optionnel)">
            <TInput value={form.address} onChange={v => set('address', v)} placeholder="Rue 10, Plateau" />
          </Field>
          <Field label="Lien Google Maps (optionnel)">
            <TInput value={form.googleMapsUrl} onChange={v => set('googleMapsUrl', v)} placeholder="https://maps.google.com/..." />
          </Field>
          <div>
            <p className="text-sm font-medium mb-3" style={{ color: '#374151' }}>Horaires d&apos;ouverture</p>
            <div className="space-y-2">
              {JOURS.map(j => {
                const h = form.openingHours[j.key] || { ouverture: '08:00', fermeture: '22:00', ferme: false }
                return (
                  <div key={j.key} className="grid grid-cols-12 gap-2 items-center rounded-xl p-2.5"
                    style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <div className="col-span-3 text-xs font-semibold" style={{ color: '#6B7280' }}>{j.label}</div>
                    <div className="col-span-3">
                      <input type="time" value={h.ouverture} disabled={h.ferme}
                        onChange={e => set('openingHours', { ...form.openingHours, [j.key]: { ...h, ouverture: e.target.value } })}
                        className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-40"
                        style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111111' }} />
                    </div>
                    <div className="col-span-3">
                      <input type="time" value={h.fermeture} disabled={h.ferme}
                        onChange={e => set('openingHours', { ...form.openingHours, [j.key]: { ...h, fermeture: e.target.value } })}
                        className="w-full px-2 py-1.5 rounded-lg text-xs focus:outline-none disabled:opacity-40"
                        style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111111' }} />
                    </div>
                    <div className="col-span-3 flex justify-end">
                      <button
                        onClick={() => set('openingHours', { ...form.openingHours, [j.key]: { ...h, ferme: !h.ferme } })}
                        className={`text-xs px-2.5 py-1 rounded-lg border ${h.ferme ? 'border-red-300 text-red-500 bg-red-50' : 'border-green-300 text-green-600 bg-green-50'}`}
                      >
                        {h.ferme ? 'Fermé' : 'Ouvert'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )

      // ── Étape 4 : Visuels ─────────────────────────────────────────────────
      case 4: return (
        <div className="space-y-5">
          {([
            { label: 'Logo (carré, JPG/PNG)', field: 'logoUrl' as const, ref: logoRef },
            { label: 'Bannière (format paysage)', field: 'bannerUrl' as const, ref: bannerRef },
            { label: 'Photo du menu complet (optionnel)', field: 'menuImageUrl' as const, ref: menuRef },
          ]).map(({ label, field, ref }) => (
            <div key={field}>
              <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>{label}</p>
              {form[field] ? (
                <div className="relative inline-block">
                  <img src={form[field]!} alt={label} className="h-24 w-auto rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />
                  <button onClick={() => set(field, null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button onClick={() => ref.current?.click()} disabled={uploading === field}
                  className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors"
                  style={{ border: '2px dashed #FED7AA', color: '#F97316' }}>
                  <Upload className="w-4 h-4" />
                  {uploading === field ? 'Upload en cours...' : 'Choisir un fichier'}
                </button>
              )}
              <input ref={ref} type="file" accept="image/*" className="hidden"
                onChange={e => { if (e.target.files?.[0]) handleUpload(field, e.target.files[0]) }} />
            </div>
          ))}
          <div>
            <p className="text-sm font-medium mb-2" style={{ color: '#374151' }}>Photos de produits (optionnel)</p>
            <div className="flex flex-wrap gap-2 mb-2">
              {form.productPhotos.map((url, i) => (
                <div key={i} className="relative">
                  <img src={url} alt="" className="h-16 w-16 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />
                  <button onClick={() => set('productPhotos', form.productPhotos.filter((_, idx) => idx !== i))}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
            <button onClick={() => photosRef.current?.click()} disabled={uploading === 'photos'}
              className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-medium hover:bg-orange-50 transition-colors"
              style={{ border: '2px dashed #FED7AA', color: '#F97316' }}>
              <Upload className="w-4 h-4" />
              {uploading === 'photos' ? 'Upload...' : 'Ajouter des photos'}
            </button>
            <input ref={photosRef} type="file" accept="image/*" multiple className="hidden"
              onChange={e => { if (e.target.files) handlePhotosUpload(e.target.files) }} />
          </div>
        </div>
      )

      // ── Étape 5 : Réseaux sociaux ─────────────────────────────────────────
      case 5: return (
        <div className="space-y-4">
          <Field label="Facebook (optionnel)">
            <TInput value={form.facebookUrl} onChange={v => set('facebookUrl', v)} placeholder="https://facebook.com/votre-page" />
          </Field>
          <Field label="Instagram (optionnel)">
            <TInput value={form.instagramUrl} onChange={v => set('instagramUrl', v)} placeholder="https://instagram.com/votre-compte" />
          </Field>
          <Field label="TikTok (optionnel)">
            <TInput value={form.tiktokUrl} onChange={v => set('tiktokUrl', v)} placeholder="https://tiktok.com/@votre-compte" />
          </Field>
          <Field label="Snapchat (optionnel)">
            <TInput value={form.snapchatUrl} onChange={v => set('snapchatUrl', v)} placeholder="https://snapchat.com/add/votre-snap" />
          </Field>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Ces informations ne seront affichées que sur les plans Pro et Premium.</p>
        </div>
      )

      // ── Étape 6 : Abonnement ──────────────────────────────────────────────
      case 6: return (
        <div className="space-y-4">
          {PLANS.map(plan => (
            <button key={plan.id} onClick={() => set('selectedPlan', plan.id)}
              className="w-full text-left rounded-2xl p-5 transition-all relative"
              style={{
                border: form.selectedPlan === plan.id ? '2px solid #F97316' : '1px solid #E5E7EB',
                backgroundColor: form.selectedPlan === plan.id ? '#FFF7ED' : '#FFFFFF',
              }}>
              {plan.popular && (
                <span className="absolute -top-3 left-4 text-xs font-bold text-white px-3 py-0.5 rounded-full" style={{ backgroundColor: '#F97316' }}>
                  LE PLUS POPULAIRE
                </span>
              )}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold" style={{ color: '#111111' }}>{plan.name}</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{plan.description}</p>
                </div>
                <div className="text-right">
                  <span className="text-xl font-black" style={{ color: form.selectedPlan === plan.id ? '#F97316' : '#111111' }}>{plan.price}</span>
                  <span className="text-xs" style={{ color: '#9CA3AF' }}> FCFA/mois</span>
                </div>
              </div>
              <ul className="space-y-1">
                {plan.features.map(f => (
                  <li key={f} className="flex items-center gap-2 text-xs" style={{ color: '#374151' }}>
                    <Check className="w-3 h-3 flex-shrink-0" style={{ color: '#F97316' }} />{f}
                  </li>
                ))}
              </ul>
              {form.selectedPlan === plan.id && (
                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold" style={{ color: '#F97316' }}>
                  <Zap className="w-3 h-3 fill-orange-500" />Plan sélectionné
                </div>
              )}
            </button>
          ))}

          {/* ── Personnalisation couleurs (Pro / Premium uniquement) ── */}
          {(form.selectedPlan === 'pro' || form.selectedPlan === 'premium') && (
            <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #E5E7EB' }}>
              <div className="px-5 py-3 flex items-center justify-between"
                style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #E5E7EB' }}>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#111111' }}>🎨 Couleurs de votre page</p>
                  <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Inclus avec votre plan {form.selectedPlan === 'pro' ? 'Pro' : 'Premium'}</p>
                </div>
              </div>

              <div className="p-5 space-y-4">
                {/* Toggle TerangaLink vs custom */}
                <div className="flex gap-2">
                  <button
                    onClick={() => set('colorChoice', 'terangalink')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: form.colorChoice === 'terangalink' ? '#F97316' : '#F3F4F6',
                      color: form.colorChoice === 'terangalink' ? '#FFFFFF' : '#6B7280',
                      border: form.colorChoice === 'terangalink' ? '2px solid #F97316' : '2px solid transparent',
                    }}>
                    Laisser TerangaLink choisir
                  </button>
                  <button
                    onClick={() => set('colorChoice', 'custom')}
                    className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                    style={{
                      backgroundColor: form.colorChoice === 'custom' ? '#111111' : '#F3F4F6',
                      color: form.colorChoice === 'custom' ? '#FFFFFF' : '#6B7280',
                      border: form.colorChoice === 'custom' ? '2px solid #111111' : '2px solid transparent',
                    }}>
                    Choisir mes couleurs
                  </button>
                </div>

                {form.colorChoice === 'terangalink' ? (
                  <div className="flex items-center gap-3 p-3 rounded-xl" style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
                    <div className="w-8 h-8 rounded-full flex-shrink-0" style={{ background: 'linear-gradient(135deg, #F97316, #FDBA74)' }} />
                    <div>
                      <p className="text-xs font-semibold" style={{ color: '#111111' }}>TerangaLink s&apos;en occupe</p>
                      <p className="text-xs" style={{ color: '#6B7280' }}>Notre équipe sélectionnera les couleurs idéales pour votre identité.</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Palettes prédéfinies */}
                    <div>
                      <p className="text-xs font-semibold mb-2.5" style={{ color: '#374151' }}>Palettes prédéfinies</p>
                      <div className="grid grid-cols-3 gap-2">
                        {COLOR_PALETTES.map(palette => {
                          const isSelected = form.primaryColor === palette.primary
                          return (
                            <button key={palette.name}
                              onClick={() => { set('primaryColor', palette.primary); set('secondaryColor', palette.secondary) }}
                              className="p-2.5 rounded-xl text-left transition-all"
                              style={{
                                border: isSelected ? `2px solid ${palette.primary}` : '2px solid #E5E7EB',
                                backgroundColor: isSelected ? palette.secondary + '40' : '#FFFFFF',
                              }}>
                              <div className="flex gap-1.5 mb-1.5">
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: palette.primary }} />
                                <div className="w-5 h-5 rounded-full" style={{ backgroundColor: palette.secondary }} />
                              </div>
                              <p className="text-xs font-medium leading-tight" style={{ color: '#374151' }}>{palette.name}</p>
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    {/* Couleurs personnalisées */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Couleur principale</p>
                        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                          <input type="color" value={form.primaryColor}
                            onChange={e => set('primaryColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                          <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{form.primaryColor}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold mb-1.5" style={{ color: '#374151' }}>Couleur secondaire</p>
                        <div className="flex items-center gap-2 p-2 rounded-xl" style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
                          <input type="color" value={form.secondaryColor}
                            onChange={e => set('secondaryColor', e.target.value)}
                            className="w-8 h-8 rounded-lg cursor-pointer border-0 bg-transparent" />
                          <span className="text-xs font-mono" style={{ color: '#6B7280' }}>{form.secondaryColor}</span>
                        </div>
                      </div>
                    </div>

                    {/* Aperçu de la page restaurant */}
                    <div>
                      <p className="text-xs font-semibold mb-2" style={{ color: '#374151' }}>Aperçu de votre page</p>
                      <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB', transform: 'scale(1)', transformOrigin: 'top left' }}>
                        {/* Fausse bannière */}
                        <div className="h-20 relative flex items-end"
                          style={{ background: `linear-gradient(135deg, ${form.primaryColor}, ${form.secondaryColor})` }}>
                          <div className="absolute bottom-0 left-0 right-0 h-8"
                            style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.4), transparent)' }} />
                          <div className="relative px-3 pb-2 flex items-center gap-2">
                            {form.logoUrl ? (
                              <img src={form.logoUrl} alt="" className="w-9 h-9 rounded-full object-cover border-2 border-white" />
                            ) : (
                              <div className="w-9 h-9 rounded-full border-2 border-white flex items-center justify-center"
                                style={{ backgroundColor: form.primaryColor }}>
                                <span className="text-xs font-bold text-white">
                                  {form.restaurantName ? form.restaurantName[0].toUpperCase() : 'R'}
                                </span>
                              </div>
                            )}
                            <p className="text-xs font-bold text-white drop-shadow">
                              {form.restaurantName || 'Votre Restaurant'}
                            </p>
                          </div>
                        </div>

                        {/* Corps de l'aperçu */}
                        <div className="bg-white p-3 space-y-2">
                          {/* Badge catégorie */}
                          <div className="flex gap-1.5">
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ backgroundColor: form.secondaryColor, color: form.primaryColor }}>
                              {form.cuisineType || 'Cuisine africaine'}
                            </span>
                            {form.city && (
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                                style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                                📍 {form.city}
                              </span>
                            )}
                          </div>

                          {/* Fausse grille de plats */}
                          <div className="grid grid-cols-2 gap-1.5">
                            {[1, 2].map(i => (
                              <div key={i} className="rounded-lg overflow-hidden"
                                style={{ border: '1px solid #F3F4F6' }}>
                                <div className="h-12" style={{ backgroundColor: form.secondaryColor + '60' }} />
                                <div className="p-1.5">
                                  <div className="h-2 rounded w-3/4 mb-1" style={{ backgroundColor: '#E5E7EB' }} />
                                  <div className="flex items-center justify-between">
                                    <div className="h-2 rounded w-1/2" style={{ backgroundColor: '#E5E7EB' }} />
                                    <div className="w-4 h-4 rounded-full flex items-center justify-center"
                                      style={{ backgroundColor: form.primaryColor }}>
                                      <span className="text-white font-bold" style={{ fontSize: '8px' }}>+</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>

                          {/* Bouton commander */}
                          <div className="pt-1">
                            <div className="w-full py-2 rounded-lg text-center text-xs font-bold text-white"
                              style={{ backgroundColor: form.primaryColor }}>
                              Commander via WhatsApp
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs mt-1.5 text-center" style={{ color: '#9CA3AF' }}>Aperçu simplifié — le rendu final peut varier</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )

      // ── Étape 7 : Communication ───────────────────────────────────────────
      case 7: return (
        <div className="space-y-5">
          {/* Toggles réseaux & photos */}
          {([
            { key: 'allowSocialMedia' as const, label: 'Partage sur les réseaux sociaux', sub: 'Acceptez-vous que TerangaLink partage votre restaurant sur ses réseaux ?' },
            { key: 'allowPhotos' as const, label: 'Utilisation de vos photos', sub: 'Acceptez-vous que TerangaLink utilise vos photos dans ses communications ?' },
          ]).map(({ key, label, sub }) => (
            <div key={key} className="flex items-start justify-between gap-4 p-4 rounded-xl"
              style={{ backgroundColor: '#F9FAFB', border: '1px solid #E5E7EB' }}>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#111111' }}>{label}</p>
                <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{sub}</p>
              </div>
              <button onClick={() => set(key, !form[key])}
                className={`flex-shrink-0 w-12 h-6 rounded-full transition-all relative ${form[key] ? 'bg-orange-500' : 'bg-gray-300'}`}>
                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ${form[key] ? 'left-6' : 'left-0.5'}`} />
              </button>
            </div>
          ))}

          {/* Publicité sponsorisée */}
          <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
            <div className="px-4 py-3" style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
              <p className="text-sm font-bold" style={{ color: '#111111' }}>
                Mise en avant sponsorisée — Facebook, Instagram & WhatsApp
              </p>
              <p className="text-xs mt-1 leading-relaxed" style={{ color: '#6B7280' }}>
                TerangaLink peut promouvoir votre restaurant via des publicités sponsorisées sur Facebook, Instagram et WhatsApp
                auprès de clients potentiels dans votre zone. Pour bénéficier d&apos;une mise en avant, vous devez proposer une offre exclusive à nos clients.
              </p>
            </div>

            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <p className="text-sm font-medium" style={{ color: '#374151' }}>
                  Acceptez-vous de proposer une offre exclusive aux clients TerangaLink lors d&apos;une publicité sponsorisée ?
                </p>
                <button onClick={() => set('allowPromoOffer', !form.allowPromoOffer)}
                  className={`flex-shrink-0 w-12 h-6 rounded-full transition-all relative ${form.allowPromoOffer ? 'bg-orange-500' : 'bg-gray-300'}`}>
                  <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all shadow ${form.allowPromoOffer ? 'left-6' : 'left-0.5'}`} />
                </button>
              </div>

              {!form.allowPromoOffer && (
                <p className="text-xs px-3 py-2 rounded-lg" style={{ backgroundColor: '#F9FAFB', color: '#9CA3AF', border: '1px solid #E5E7EB' }}>
                  Sans offre exclusive, votre restaurant ne pourra pas bénéficier des mises en avant sponsorisées TerangaLink.
                </p>
              )}

              {form.allowPromoOffer && (
                <div className="space-y-2 pt-1">
                  {[
                    { value: '10_percent', label: '-10% sur toute la carte' },
                    { value: 'free_delivery', label: 'Livraison offerte' },
                    { value: 'custom', label: 'Offre personnalisée' },
                  ].map(opt => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer p-2.5 rounded-xl transition-colors"
                      style={{
                        backgroundColor: form.promoOfferType === opt.value ? '#FFF7ED' : 'transparent',
                        border: `1px solid ${form.promoOfferType === opt.value ? '#FED7AA' : 'transparent'}`,
                      }}>
                      <input type="radio" name="promoType" value={opt.value}
                        checked={form.promoOfferType === opt.value}
                        onChange={() => set('promoOfferType', opt.value)}
                        className="accent-orange-500" />
                      <span className="text-sm font-medium" style={{ color: '#374151' }}>{opt.label}</span>
                    </label>
                  ))}
                  {form.promoOfferType === 'custom' && (
                    <textarea value={form.promoOfferCustom} onChange={e => set('promoOfferCustom', e.target.value)}
                      placeholder="Décrivez votre offre..." rows={2}
                      className="w-full px-3 py-2 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                      style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111111' }} />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )

      // ── Étape 8 : Validation ──────────────────────────────────────────────
      case 8: return (
        <div className="space-y-4">
          <p className="text-sm" style={{ color: '#6B7280' }}>Vérifiez vos informations avant d&apos;envoyer votre demande.</p>
          {[
            { title: 'Compte', items: [['Responsable', form.ownerName], ['Restaurant', form.restaurantName], ['Email', form.email], ['WhatsApp', form.whatsapp]] },
            { title: 'Restaurant', items: [['Type de cuisine', form.cuisineType || '—'], ['Description', form.description ? form.description.slice(0, 60) + '...' : '—'], ['Ville', form.city || '—']] },
            { title: 'Abonnement', items: [
              ['Plan choisi', PLANS.find(p => p.id === form.selectedPlan)?.name + ' — ' + PLANS.find(p => p.id === form.selectedPlan)?.price + ' FCFA/mois'],
              ...(form.selectedPlan === 'pro' || form.selectedPlan === 'premium'
                ? [['Couleurs', form.colorChoice === 'terangalink' ? 'Laissé à TerangaLink' : `${form.primaryColor} / ${form.secondaryColor}`]]
                : [])
            ] as [string, string][] },
            { title: 'Communication', items: [['Réseaux sociaux', form.allowSocialMedia ? 'Oui' : 'Non'], ['Utilisation photos', form.allowPhotos ? 'Oui' : 'Non'], ['Offre promo', form.allowPromoOffer ? (form.promoOfferType === '10_percent' ? '-10%' : form.promoOfferType === 'free_delivery' ? 'Livraison offerte' : form.promoOfferCustom || 'Personnalisée') : 'Non']] },
          ].map(section => (
            <div key={section.title} className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
              <div className="px-4 py-2.5" style={{ backgroundColor: '#F9FAFB', borderBottom: '1px solid #E5E7EB' }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#6B7280' }}>{section.title}</p>
              </div>
              <div className="divide-y divide-gray-100">
                {section.items.map(([k, v]) => (
                  <div key={k} className="flex justify-between px-4 py-2.5 gap-4">
                    <span className="text-xs" style={{ color: '#9CA3AF' }}>{k}</span>
                    <span className="text-xs font-medium text-right" style={{ color: '#111111' }}>{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(form.logoUrl || form.bannerUrl) && (
            <div className="flex gap-3">
              {form.logoUrl && <img src={form.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />}
              {form.bannerUrl && <img src={form.bannerUrl} alt="Bannière" className="h-16 w-auto rounded-xl object-cover" style={{ border: '1px solid #E5E7EB' }} />}
            </div>
          )}
          {(form.selectedPlan === 'pro' || form.selectedPlan === 'premium') && form.colorChoice === 'custom' && (
            <div className="flex items-center gap-3 p-3 rounded-xl" style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
              <div className="flex gap-2">
                <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: form.primaryColor }} />
                <div className="w-8 h-8 rounded-full shadow-sm" style={{ backgroundColor: form.secondaryColor }} />
              </div>
              <div>
                <p className="text-xs font-semibold" style={{ color: '#111111' }}>Couleurs personnalisées</p>
                <p className="text-xs" style={{ color: '#6B7280' }}>{form.primaryColor} · {form.secondaryColor}</p>
              </div>
            </div>
          )}
        </div>
      )

      default: return null
    }
  }

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <header className="px-4 py-4 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <Link href="/" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-lg" style={{ color: '#111111' }}>
          <span style={{ color: '#F97316' }}>Teranga</span>Link
        </span>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>— Inscription restaurant</span>
      </header>

      <div className="max-w-xl mx-auto px-4 py-8">

        {/* Progression */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold" style={{ color: '#111111' }}>
              Étape {step}/{STEPS.length} — {STEPS[step - 1].label}
            </p>
            <p className="text-xs" style={{ color: '#9CA3AF' }}>{Math.round((step / STEPS.length) * 100)}%</p>
          </div>
          <div className="h-2 rounded-full" style={{ backgroundColor: '#E5E7EB' }}>
            <div className="h-2 rounded-full transition-all duration-300" style={{ width: `${(step / STEPS.length) * 100}%`, backgroundColor: '#F97316' }} />
          </div>
          <div className="flex justify-between mt-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const done = i + 1 < step
              const active = i + 1 === step
              return (
                <div key={i} className="flex flex-col items-center">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center transition-all"
                    style={{ backgroundColor: done ? '#F97316' : active ? '#FFF7ED' : '#F3F4F6', border: active ? '2px solid #F97316' : 'none' }}>
                    {done ? <Check className="w-3.5 h-3.5 text-white" /> : <Icon className="w-3.5 h-3.5" style={{ color: active ? '#F97316' : '#9CA3AF' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Contenu */}
        <div className="rounded-2xl p-6 mb-6" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
          <h2 className="text-xl font-bold mb-6" style={{ color: '#111111' }}>{STEPS[step - 1].label}</h2>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex gap-3">
          {step > 1 && (
            <button onClick={prev} className="flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-colors"
              style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#6B7280' }}>
              <ArrowLeft className="w-4 h-4" />Précédent
            </button>
          )}
          {step < 8 ? (
            <button onClick={next} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#F97316' }}>
              Suivant<ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#F97316' }}>
              {submitting ? 'Envoi en cours...' : <><Check className="w-4 h-4" />Envoyer ma demande</>}
            </button>
          )}
        </div>

        {/* Pied d'aide discret */}
        <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E5E7EB' }}>
          <p className="text-xs text-center mb-3" style={{ color: '#9CA3AF' }}>
            Besoin d&apos;aide ou d&apos;éclaircissements ?
          </p>
          <div className="flex gap-2 justify-center">
            <a
              href="https://wa.me/221774739266?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20pour%20mon%20inscription%20sur%20TerangaLink."
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium px-3.5 py-2 rounded-lg transition-colors hover:bg-gray-100"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
              <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
              WhatsApp
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
