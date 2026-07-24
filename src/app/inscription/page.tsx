'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { CUISINE_OPTIONS } from '@/lib/cuisines'
import { PLANS, type PlanKey } from '@/lib/plans'
import { slugify } from '@/lib/utils'
import { fileToCompressedBase64 } from '@/lib/imageUtils'
import { RestaurantLivePreview } from '@/components/onboarding/RestaurantLivePreview'
import { Logo } from '@/components/ui/Logo'
import { useRouter } from 'next/navigation'
import { Check, ArrowLeft, ArrowRight, Store, X, Eye } from 'lucide-react'

const TOTAL_STEPS = 5

const COLOR_PALETTE = [
  '#F97316', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#DB2777', '#0891B2', '#111111',
]

const THEMES = [
  { value: 'light', label: 'Clair', bg: '#FFFFFF', text: '#111111' },
  { value: 'dark', label: 'Sombre', bg: '#111111', text: '#FFFFFF' },
  { value: 'vibrant', label: 'Coloré', bg: 'accent', text: '#FFFFFF' },
]

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 bg-white transition-colors'
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'

const STEP_LABELS = ['Restaurant', 'Contact', 'Offre', 'Identité', 'Résumé']

export default function InscriptionPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    restaurant_name: '',
    slug: '',
    cuisine_type: '',
    city: 'Dakar',
    description: '',
    owner_name: '',
    email: '',
    password: '',
    password_confirm: '',
    phone: '',
    whatsapp_number: '',
    plan: 'starter' as PlanKey,
    primary_color: '#F97316',
    theme: 'light',
    facebook_url: '',
    instagram_url: '',
    tiktok_url: '',
    referral_code: '',
    snapchat_url: '',
    logo_base64: '',
    cover_base64: '',
    consent_images: false,
    consent_annuaire: false,
    consent_marketing: false,
  })
  const [slugTouched, setSlugTouched] = useState(false)
  const [siteOrigin, setSiteOrigin] = useState('')
  const [planPrices, setPlanPrices] = useState<Record<string, number>>({ starter: PLANS.starter.price, pro: PLANS.pro.price })
  const [logoFileName, setLogoFileName] = useState('')
  const [coverFileName, setCoverFileName] = useState('')
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)

  useEffect(() => {
    if (!slugTouched && form.restaurant_name) {
      setForm(f => ({ ...f, slug: slugify(f.restaurant_name) }))
    }
  }, [form.restaurant_name, slugTouched])

  useEffect(() => {
    setSiteOrigin(window.location.origin)
    const params = new URLSearchParams(window.location.search)
    const ref = params.get('ref')
    if (ref) setForm(f => ({ ...f, referral_code: ref.toUpperCase() }))
  }, [])

  useEffect(() => {
    fetch('/api/platform-settings')
      .then(r => r.json())
      .then(data => setPlanPrices({ starter: data.plan_starter_price ?? PLANS.starter.price, pro: data.plan_pro_price ?? PLANS.pro.price }))
      .catch(() => {})
  }, [])

  function set(k: string, v: unknown) { setForm(f => ({ ...f, [k]: v })) }

  function canGoNext(): boolean {
    if (step === 1) return !!form.restaurant_name && !!form.whatsapp_number
    if (step === 2) {
      return !!form.owner_name && !!form.email && !!form.phone
        && form.password.length >= 8 && form.password === form.password_confirm
    }
    if (step === 5) return form.consent_images && form.consent_annuaire
    return true
  }

  async function submit() {
    if (!form.consent_images || !form.consent_annuaire) {
      setError('Veuillez accepter les autorisations obligatoires.')
      return
    }
    if (form.password.length < 8 || form.password !== form.password_confirm) {
      setError('Mot de passe invalide — retournez à l\'étape 2.')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/super-admin/inscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurant_name: form.restaurant_name,
          slug: form.slug || slugify(form.restaurant_name),
          owner_name: form.owner_name,
          email: form.email,
          password: form.password,
          phone: form.phone,
          whatsapp_number: form.whatsapp_number,
          cuisine_type: form.cuisine_type,
          city: form.city,
          description: form.description,
          plan: form.plan,
          primary_color: form.plan === 'pro' ? form.primary_color : '#F97316',
          theme: form.plan === 'pro' ? form.theme : 'light',
          facebook_url: form.facebook_url || null,
          instagram_url: form.instagram_url || null,
          tiktok_url: form.tiktok_url || null,
          snapchat_url: form.snapchat_url || null,
          referral_code: form.referral_code || null,
          logo_base64: form.logo_base64 || null,
          cover_base64: form.cover_base64 || null,
          consent_images: form.consent_images,
          consent_annuaire: form.consent_annuaire,
          consent_marketing: form.consent_marketing,
        }),
      })
      if (res.ok) {
        router.push('/inscription/merci')
      } else {
        const data = await res.json()
        setError(data.error || 'Une erreur est survenue.')
        setLoading(false)
      }
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="px-6 py-5 flex items-center justify-between bg-white" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <Link href="/"><Logo textClassName="font-bold text-xl" textStyle={{ color: '#111111' }} /></Link>
        <Link href="/pour-les-restaurants" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-orange transition-colors">← Retour</Link>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Créez votre restaurant</h1>
          <p className="text-gray-500">Rejoignez TerangaLink en quelques minutes</p>
        </div>

        <div className="lg:grid lg:grid-cols-[1fr,380px] lg:gap-8 lg:items-start">
        <div className="max-w-2xl mx-auto lg:max-w-none w-full">

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            {STEP_LABELS.map((label, i) => {
              const s = i + 1
              return (
                <div key={s} className="flex flex-col items-center gap-1.5">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                    s < step ? 'bg-brand-orange text-white' : s === step ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-400'
                  }`}>
                    {s < step ? <Check className="w-4 h-4" /> : s}
                  </div>
                  <span className={`text-[10px] font-medium hidden sm:block ${s === step ? 'text-brand-orange' : 'text-gray-400'}`}>{label}</span>
                </div>
              )
            })}
          </div>
          <div className="relative h-1 bg-gray-200 rounded-full mt-1">
            <div className="absolute left-0 top-0 h-full bg-brand-orange rounded-full transition-all"
              style={{ width: `${((step - 1) / (TOTAL_STEPS - 1)) * 100}%` }} />
          </div>
          <p className="text-xs text-gray-400 text-center mt-2">Étape {step} sur {TOTAL_STEPS}</p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 sm:p-8 shadow-sm">

          {/* Step 1 — Restaurant */}
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Informations du restaurant</h2>
              <div>
                <label className={labelClass}>Nom du restaurant *</label>
                <input value={form.restaurant_name} onChange={e => set('restaurant_name', e.target.value)}
                  className={inputClass} placeholder="Ex: Fatou Mode" />
              </div>
              <div>
                <label className={labelClass}>Slug (URL) — optionnel</label>
                <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-brand-orange">
                  <span className="text-xs text-gray-400 pl-4 pr-1 shrink-0">{siteOrigin.replace(/^https?:\/\//, '')}/</span>
                  <input value={form.slug} onChange={e => { setSlugTouched(true); set('slug', e.target.value) }}
                    className="flex-1 py-3 pr-4 text-sm bg-white focus:outline-none" placeholder="votre-restaurant" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Catégorie</label>
                <select value={form.cuisine_type} onChange={e => set('cuisine_type', e.target.value)} className={inputClass}>
                  {CUISINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Ville</label>
                <input value={form.city} onChange={e => set('city', e.target.value)} className={inputClass} placeholder="Dakar" />
              </div>
              <div>
                <label className={labelClass}>Description courte (apparaîtra sur votre vitrine)</label>
                <textarea value={form.description} onChange={e => set('description', e.target.value)}
                  rows={3} className={inputClass + ' resize-none'} placeholder="Décrivez votre activité en quelques mots..." />
              </div>
              <div>
                <label className={labelClass}>Numéro WhatsApp (pour recevoir les commandes) *</label>
                <input type="tel" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)}
                  className={inputClass} placeholder="+221 77 000 00 00" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <label className={labelClass}>Logo du restaurant (optionnel)</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="shrink-0 text-xs font-medium bg-orange-50 text-brand-orange px-3 py-2 rounded-lg hover:bg-orange-100 transition-colors">
                      Choisir un fichier
                    </span>
                    <span className="text-sm text-gray-500 truncate">{logoFileName || 'Aucun fichier choisi'}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setLogoFileName(file.name)
                        set('logo_base64', await fileToCompressedBase64(file, 500))
                      }} />
                  </label>
                  {form.logo_base64 && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.logo_base64} alt="Logo preview" className="w-14 h-14 rounded-xl object-cover border border-gray-200" />
                    </div>
                  )}
                </div>
                <div>
                  <label className={labelClass}>Bannière / photo de couverture (optionnel)</label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <span className="shrink-0 text-xs font-medium bg-orange-50 text-brand-orange px-3 py-2 rounded-lg hover:bg-orange-100 transition-colors">
                      Choisir un fichier
                    </span>
                    <span className="text-sm text-gray-500 truncate">{coverFileName || 'Aucun fichier choisi'}</span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={async e => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        setCoverFileName(file.name)
                        set('cover_base64', await fileToCompressedBase64(file, 1200))
                      }} />
                  </label>
                  {form.cover_base64 && (
                    <div className="mt-2">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={form.cover_base64} alt="Bannière preview" className="w-full h-20 rounded-xl object-cover border border-gray-200" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Contact */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-5">Vos informations</h2>
              <div>
                <label className={labelClass}>Nom du responsable *</label>
                <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)}
                  className={inputClass} placeholder="Aminata Diallo" />
              </div>
              <div>
                <label className={labelClass}>Email *</label>
                <input type="email" value={form.email} onChange={e => set('email', e.target.value)}
                  className={inputClass} placeholder="vous@email.com" />
              </div>
              <div>
                <label className={labelClass}>Créez un mot de passe *</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)}
                  className={inputClass} placeholder="8 caractères minimum" minLength={8} />
                <p className="text-xs text-gray-400 mt-1.5">Ce sera votre mot de passe de connexion au dashboard, envoyé par email dès l&apos;acceptation de votre restaurant.</p>
              </div>
              <div>
                <label className={labelClass}>Confirmer le mot de passe *</label>
                <input type="password" value={form.password_confirm} onChange={e => set('password_confirm', e.target.value)}
                  className={inputClass} placeholder="Répétez le mot de passe" />
                {form.password_confirm && form.password !== form.password_confirm && (
                  <p className="text-xs text-red-500 mt-1.5">Les mots de passe ne correspondent pas.</p>
                )}
              </div>
              <div>
                <label className={labelClass}>Téléphone *</label>
                <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)}
                  className={inputClass} placeholder="+221 77 000 00 00" />
              </div>
            </div>
          )}

          {/* Step 3 — Plan + Options */}
          {step === 3 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-5">Choisissez votre offre</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {(Object.entries(PLANS) as [string, typeof PLANS.starter][]).map(([key, plan]) => (
                  <button key={key} type="button"
                    onClick={() => set('plan', key as PlanKey)}
                    className={`text-left rounded-2xl p-5 border-2 transition-all ${form.plan === key ? 'border-brand-orange bg-orange-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-bold text-gray-900">{plan.name}</span>
                      {form.plan === key && (
                        <span className="w-5 h-5 rounded-full flex items-center justify-center bg-brand-orange">
                          <Check className="w-3 h-3 text-white" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-1 mb-3">
                      <span className="text-2xl font-bold text-gray-900">{new Intl.NumberFormat('fr-SN').format(planPrices[key] ?? plan.price)}</span>
                      <span className="text-xs text-gray-400">FCFA/mois</span>
                    </div>
                    <ul className="space-y-1.5">
                      {plan.features.slice(0, 5).map(f => (
                        <li key={f} className="flex items-start gap-1.5 text-xs text-gray-600">
                          <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />{f}
                        </li>
                      ))}
                      {plan.features.length > 5 && (
                        <li className="text-xs text-gray-400">+{plan.features.length - 5} autres avantages...</li>
                      )}
                    </ul>
                  </button>
                ))}
              </div>
              {form.plan === 'free' && (
                <p className="text-center text-xs text-gray-400 mt-4">Gratuit, sans limite de durée · Aucun paiement requis</p>
              )}

              {/* Color picker for Pro */}
              {form.plan === 'pro' && (
                <div className="mt-6 border-t border-gray-100 pt-6">
                  <p className="text-sm font-semibold text-gray-900 mb-3">Couleur d&apos;accent de votre vitrine</p>
                  <div className="flex flex-wrap gap-2.5 mb-3">
                    {COLOR_PALETTE.map(c => (
                      <button key={c} type="button"
                        onClick={() => set('primary_color', c)}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${form.primary_color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                        style={{ backgroundColor: c }} />
                    ))}
                    <input type="color" value={form.primary_color}
                      onChange={e => set('primary_color', e.target.value)}
                      className="w-8 h-8 rounded-full border-2 border-gray-200 cursor-pointer"
                      title="Couleur personnalisée" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900 mb-3 mt-5">Thème de votre vitrine</p>
                  <div className="flex gap-2">
                    {THEMES.map(t => (
                      <button key={t.value} type="button" onClick={() => set('theme', t.value)}
                        className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                        style={{
                          borderColor: form.theme === t.value ? '#F97316' : '#E5E7EB',
                          backgroundColor: t.bg === 'accent' ? form.primary_color : t.bg,
                          color: t.text,
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {form.plan !== 'pro' && (
                <p className="text-xs text-gray-400 text-center mt-4">La couleur orange TerangaLink par défaut sera utilisée. Passez en Pro pour personnaliser.</p>
              )}
            </div>
          )}

          {/* Step 4 — Social media */}
          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-gray-900 mb-2">Réseaux sociaux</h2>
              <p className="text-sm text-gray-500 mb-5">Ces liens seront affichés sur votre vitrine. Tous les champs sont optionnels.</p>
              <div>
                <label className={labelClass}>Instagram</label>
                <input value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)}
                  className={inputClass} placeholder="https://instagram.com/votre-restaurant" />
              </div>
              <div>
                <label className={labelClass}>Facebook</label>
                <input value={form.facebook_url} onChange={e => set('facebook_url', e.target.value)}
                  className={inputClass} placeholder="https://facebook.com/votre-restaurant" />
              </div>
              <div>
                <label className={labelClass}>TikTok</label>
                <input value={form.tiktok_url} onChange={e => set('tiktok_url', e.target.value)}
                  className={inputClass} placeholder="https://tiktok.com/@votre-restaurant" />
              </div>
              <div>
                <label className={labelClass}>Snapchat</label>
                <input value={form.snapchat_url} onChange={e => set('snapchat_url', e.target.value)}
                  className={inputClass} placeholder="https://snapchat.com/add/votre-restaurant" />
              </div>
              <div className="pt-2 border-t border-gray-100">
                <label className={labelClass}>Code de parrainage (optionnel)</label>
                <input value={form.referral_code} onChange={e => set('referral_code', e.target.value.toUpperCase())}
                  className={inputClass} placeholder="Ex: MENU25" maxLength={20} />
                <p className="text-xs text-gray-400 mt-1.5">Si quelqu&apos;un vous a recommandé TerangaLink, entrez son code pour bénéficier d&apos;une réduction de 25% chacun(e).</p>
              </div>
            </div>
          )}

          {/* Step 5 — Summary + Autorisations */}
          {step === 5 && (
            <div>
              <h2 className="text-lg font-bold text-gray-900 mb-5">Récapitulatif</h2>
              <div className="space-y-3 text-sm">
                {[
                  { label: 'Restaurant', value: form.restaurant_name },
                  { label: 'Catégorie', value: form.cuisine_type },
                  { label: 'Ville', value: form.city },
                  { label: 'WhatsApp', value: form.whatsapp_number },
                  { label: 'Responsable', value: form.owner_name },
                  { label: 'Email', value: form.email },
                  { label: 'Téléphone', value: form.phone },
                  {
                    label: 'Plan',
                    value: `${PLANS[form.plan].name}${(planPrices[form.plan] ?? PLANS[form.plan].price) > 0 ? ` — ${new Intl.NumberFormat('fr-SN').format(planPrices[form.plan] ?? PLANS[form.plan].price)} FCFA/mois` : ' — Gratuit'}`,
                  },
                ].map(({ label, value }) => value && (
                  <div key={label} className="flex items-start justify-between gap-4 py-2 border-b border-gray-50">
                    <span className="text-gray-500 shrink-0">{label}</span>
                    <span className="text-gray-900 font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>

              {/* Autorisations */}
              <div className="mt-6 bg-gray-50 rounded-2xl p-5 space-y-4">
                <p className="text-sm font-semibold text-gray-900">Autorisations & consentements</p>

                {/* Obligatoire 1 */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consent_images}
                    onChange={e => set('consent_images', e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium text-red-500">*</span> J&apos;autorise TerangaLink à utiliser les photos et visuels de mon restaurant (logo, bannière, plats) pour des publications organiques et des publicités payantes sur les réseaux sociaux (Instagram, Facebook, TikTok) dans le cadre de la promotion de la plateforme.
                  </span>
                </label>

                {/* Obligatoire 2 */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consent_annuaire}
                    onChange={e => set('consent_annuaire', e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0" />
                  <span className="text-sm text-gray-700">
                    <span className="font-medium text-red-500">*</span> J&apos;accepte d&apos;être référencé(e) dans l&apos;annuaire public de TerangaLink et que mes informations professionnelles (nom, catégorie, ville, contact) soient visibles par tous les utilisateurs.
                  </span>
                </label>

                {/* Optionnel */}
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={form.consent_marketing}
                    onChange={e => set('consent_marketing', e.target.checked)}
                    className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0" />
                  <span className="text-sm text-gray-700">
                    J&apos;accepte de recevoir des conseils, des offres partenaires et des actualités de TerangaLink par email ou WhatsApp. <span className="text-gray-400">(optionnel)</span>
                  </span>
                </label>

                <p className="text-xs text-gray-400">Les champs marqués <span className="text-red-500">*</span> sont obligatoires pour valider votre inscription.</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mt-5">
                  {error}
                </div>
              )}
              <button onClick={submit} disabled={loading || !form.consent_images || !form.consent_annuaire}
                className="w-full mt-6 bg-brand-orange text-white py-3.5 rounded-xl font-bold transition-colors hover:bg-brand-orange-dark disabled:opacity-50 flex items-center justify-center gap-2">
                <Store className="w-4 h-4" />
                {loading ? 'Envoi en cours...' : 'Envoyer ma demande'}
              </button>
              <p className="text-center text-xs text-gray-400 mt-3">
                En soumettant, vous acceptez nos{' '}
                <Link href="/legal" className="underline hover:text-brand-orange">mentions légales</Link>.
              </p>
            </div>
          )}

          {/* Nav buttons */}
          {step < 5 && (
            <div className={`flex gap-3 mt-6 ${step === 1 ? 'justify-end' : ''}`}>
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex items-center gap-1.5 px-5 py-3 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Précédent
                </button>
              )}
              <button onClick={() => setStep(s => s + 1)} disabled={!canGoNext()}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-orange text-white py-3 rounded-xl font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                {step === 4 ? 'Voir le résumé' : 'Suivant'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
          {step === 5 && step > 1 && (
            <button onClick={() => setStep(s => s - 1)}
              className="w-full mt-3 flex items-center justify-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Modifier
            </button>
          )}
        </div>

        {/* Bouton preview mobile — flottant */}
        <button type="button" onClick={() => setMobilePreviewOpen(true)}
          className="lg:hidden fixed bottom-5 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-white bg-black px-4 py-2.5 rounded-full shadow-lg">
          <Eye className="w-3.5 h-3.5" />
          Prévisualiser mon restaurant
        </button>
        </div>

        {/* Preview live desktop */}
        <div className="hidden lg:block lg:sticky lg:top-8">
          <RestaurantLivePreview
            name={form.restaurant_name}
            category={form.cuisine_type}
            city={form.city}
            logoUrl={form.logo_base64 || undefined}
            coverUrl={form.cover_base64 || undefined}
            primaryColor={form.plan === 'pro' ? form.primary_color : '#F97316'}
            theme={form.plan === 'pro' ? form.theme : 'light'}
          />
        </div>
        </div>
      </div>

      {/* Preview mobile en bottom sheet */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setMobilePreviewOpen(false)}>
          <div className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto p-4"
            onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobilePreviewOpen(false)} aria-label="Fermer"><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <RestaurantLivePreview
              name={form.restaurant_name}
              category={form.cuisine_type}
              city={form.city}
              logoUrl={form.logo_base64 || undefined}
              coverUrl={form.cover_base64 || undefined}
              primaryColor={form.plan === 'pro' ? form.primary_color : '#F97316'}
              theme={form.plan === 'pro' ? form.theme : 'light'}
            />
          </div>
        </div>
      )}
    </div>
  )
}
