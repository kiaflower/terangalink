'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { CUISINE_OPTIONS } from '@/lib/cuisines'
import { RestaurantLivePreview } from '@/components/onboarding/RestaurantLivePreview'
import { Logo } from '@/components/ui/Logo'
import {
  Sparkles, Crown, BadgeCheck, Users2, Rocket,
  Image as ImageIcon, Images, CheckCircle, X, ArrowLeft, ArrowRight, Check, Eye,
} from 'lucide-react'

const COLOR_PALETTE = ['#F97316', '#2563EB', '#059669', '#DC2626', '#D97706', '#DB2777', '#0891B2', '#111111']
const THEMES = [
  { value: 'light', label: 'Clair', bg: '#FFFFFF', text: '#111111' },
  { value: 'dark', label: 'Sombre', bg: '#111111', text: '#FFFFFF' },
  { value: 'vibrant', label: 'Coloré', bg: 'accent', text: '#FFFFFF' },
]

const TEXT_PRIMARY = '#111111'
const TEXT_SECONDARY = '#6B7280'
const TEXT_MUTED = '#9CA3AF'
const TEXT_PRO = '#F97316'
const BORDER = '#F3F4F6'
const BORDER_STRONG = '#E5E7EB'
const SURFACE_2 = '#F9FAFB'

const inputClass = 'w-full text-sm rounded-lg px-3 py-2.5 outline-none transition-colors bg-white'
const labelClass = 'text-xs font-medium block mb-1.5'

const OFFER_ITEMS = [
  {
    icon: Crown,
    title: 'Plan Pro à prix réduit',
    desc: 'Accès complet à toutes les fonctionnalités pendant 6 mois.',
    price: '12 900 FCFA',
    oldPrice: '19 900 FCFA/mois',
  },
  {
    icon: BadgeCheck,
    title: 'Badge Vérifié offert',
    desc: "Affiché sur votre vitrine et dans l'annuaire pendant 6 mois.",
  },
  {
    icon: Users2,
    title: 'Atelier individuel 45 min',
    desc: 'Comment fixer vos prix, structurer votre menu et vendre plus.',
  },
  {
    icon: Rocket,
    title: 'On prépare votre restaurant ensemble',
    desc: '7 jours pour configurer votre vitrine, ajouter vos plats, tester avec de vrais clients avant le lancement officiel.',
  },
]

const TIMELINE = [
  { heading: 'Vous remplissez le formulaire', body: 'Votre fiche complète arrive directement chez TerangaLink.' },
  { heading: 'On vous contacte sous 24h', body: 'Par WhatsApp pour confirmer votre inscription et les modalités de paiement.' },
  { heading: 'On prépare vos premiers jours de vente ensemble', body: '7 jours de préparation. Dès que votre restaurant est prête, nous la présentons sur les réseaux et vous commencez à vendre avant tout le monde.' },
  { heading: 'Lancement officiel — vous êtes déjà prêt(e) !', body: 'Vos clients peuvent commander. Votre restaurant est vérifiée et prête à vendre.' },
]

const emptyForm = {
  restaurant_name: '', cuisine_type: '', city: '', description: '',
  owner_name: '', email: '', phone: '', whatsapp_number: '',
  plan: 'pro' as const,
  primary_color: '#F97316',
  theme: 'light',
  referral_code: '',
  wave_number: '', orange_money_number: '',
  instagram_url: '', facebook_url: '', tiktok_url: '', snapchat_url: '',
  consent_images: false,
  consent_annuaire: false,
  consent_marketing: false,
}

const STEP_LABELS = ['Votre restaurant', 'Identité visuelle', 'Vos informations', 'Couleur & thème', 'Paiement mobile', 'Réseaux sociaux', 'Consentements']
const TOTAL_STEPS = STEP_LABELS.length

function FieldGroup({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className={labelClass} style={{ color: TEXT_SECONDARY }}>{label}</label>
      {hint && <span className="text-[11px] block mb-1.5" style={{ color: TEXT_MUTED }}>{hint}</span>}
      {children}
    </div>
  )
}

function UploadZone({
  icon: Icon, label, hint, preview, onChange,
}: {
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  label: string
  hint: string
  preview: string | null
  onChange: (file: File | undefined) => void
}) {
  return (
    <label
      className="block rounded-xl text-center cursor-pointer overflow-hidden"
      style={{ border: `1px dashed ${BORDER_STRONG}`, backgroundColor: '#FFFFFF' }}
    >
      <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
        onChange={e => onChange(e.target.files?.[0])} />
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={label} className="w-full h-28 object-cover" />
      ) : (
        <div className="p-5">
          <Icon className="w-5 h-5 mx-auto mb-1.5" style={{ color: TEXT_MUTED }} />
          <span className="text-xs block" style={{ color: TEXT_SECONDARY }}>{label}</span>
          <small className="text-[11px] block mt-0.5" style={{ color: TEXT_MUTED }}>{hint}</small>
        </div>
      )}
    </label>
  )
}

export default function EarlyAccessClient() {
  const [placesLeft, setPlacesLeft] = useState<number>(15)
  const [taken, setTaken] = useState<number | null>(null)
  const [isOpen, setIsOpen] = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const [placeNumber, setPlaceNumber] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [wizardOpen, setWizardOpen] = useState(false)
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false)
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(emptyForm)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [coverFile, setCoverFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)

  const [waitlistName, setWaitlistName] = useState('')
  const [waitlistPhone, setWaitlistPhone] = useState('')
  const [waitlistSubmitted, setWaitlistSubmitted] = useState(false)

  const [activeTimelineStep, setActiveTimelineStep] = useState(0)
  const timelineRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    function handleScroll() {
      const triggerY = window.innerHeight * 0.35
      const nearBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 40
      let newActive = -1
      timelineRefs.current.forEach((el, i) => {
        if (!el) return
        if (el.getBoundingClientRect().top <= triggerY) newActive = i
      })
      if (nearBottom) newActive = TIMELINE.length - 1
      setActiveTimelineStep(prev => Math.max(prev, newActive))
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    async function fetchPlaces() {
      try {
        const res = await fetch('/api/early-access', { cache: 'no-store' })
        const data = await res.json()
        setPlacesLeft(data.remaining ?? 15)
        setTaken(data.taken ?? null)
        setIsOpen(data.isOpen ?? true)
      } catch {
        // Erreur réseau : on garde les valeurs par défaut (15 places, ouvert)
        // plutôt que de bloquer l'affichage de la page.
      }
    }
    fetchPlaces()
    const interval = setInterval(fetchPlaces, 30000)
    return () => clearInterval(interval)
  }, [])

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function previewFile(file: File | undefined, setFile: (f: File | null) => void, setPreview: (url: string | null) => void) {
    setFile(file ?? null)
    if (!file) { setPreview(null); return }
    const reader = new FileReader()
    reader.onload = () => setPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  function openWizard() {
    setStep(1)
    setForm(emptyForm)
    setLogoFile(null)
    setCoverFile(null)
    setLogoPreview(null)
    setCoverPreview(null)
    setError('')
    setWizardOpen(true)
  }

  function closeWizard() {
    setWizardOpen(false)
  }

  function canGoNext(): boolean {
    if (step === 1) return !!form.restaurant_name && !!form.cuisine_type && !!form.city
    if (step === 3) return !!form.owner_name && !!form.email && !!form.phone && !!form.whatsapp_number
    return true
  }

  async function handleSubmit() {
    if (!form.consent_images || !form.consent_annuaire) {
      setError('Veuillez accepter les autorisations obligatoires.')
      return
    }
    setLoading(true)
    setError('')
    const formData = new FormData()
    Object.entries(form).forEach(([key, value]) => formData.append(key, String(value)))
    if (logoFile) formData.append('logo', logoFile)
    if (coverFile) formData.append('cover', coverFile)

    try {
      const res = await fetch('/api/early-access', { method: 'POST', body: formData })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue')
        setLoading(false)
        return
      }
      setSubmitted(true)
      setPlaceNumber(data.place_number)
      setWizardOpen(false)
    } catch {
      setError('Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault()
    if (!waitlistName.trim() || !waitlistPhone.trim()) return
    await fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: waitlistName.trim(), phone: waitlistPhone.trim() }),
    }).catch(() => {})
    setWaitlistSubmitted(true)
  }

  const formOpen = isOpen && placesLeft > 0 && !submitted
  const inputStyle: React.CSSProperties = { border: `1px solid ${BORDER_STRONG}`, color: TEXT_PRIMARY }

  return (
    <div style={{ backgroundColor: '#FFFFFF', color: TEXT_PRIMARY }}>
      {/* Minimal header */}
      <header className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: `1px solid ${BORDER}` }}>
        <Link href="/"><Logo textClassName="font-bold text-xl" textStyle={{ color: TEXT_PRIMARY }} /></Link>
        <Link href="/login" className="text-sm font-medium px-4 py-2 rounded-xl transition-colors hover:text-brand-orange"
          style={{ color: TEXT_SECONDARY, border: `1px solid ${BORDER_STRONG}` }}>
          Se connecter
        </Link>
      </header>

      {/* HERO */}
      <div className="text-center px-5 pt-10 pb-8" style={{ backgroundColor: '#FAFAFA', borderBottom: `1px solid ${BORDER}` }}>
        <div className="inline-flex items-center gap-1.5 uppercase font-medium text-[11px] tracking-wide rounded-full px-2.5 py-1 mb-5"
          style={{ backgroundColor: 'rgba(249,115,22,0.08)', color: TEXT_PRO, border: '1px solid rgba(249,115,22,0.15)' }}>
          <Sparkles className="w-3.5 h-3.5" />
          Offre de lancement
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black leading-[1.15] tracking-tight mb-3" style={{ color: TEXT_PRIMARY }}>
          15 restaurants.
          <span className="block text-4xl sm:text-5xl lg:text-6xl font-black" style={{ color: TEXT_PRO }}>Des avantages que vous n&apos;aurez plus jamais.</span>
        </h1>
        <p className="text-sm leading-relaxed max-w-xs mx-auto mb-6" style={{ color: TEXT_SECONDARY }}>
          Pas 100. Pas 50. 15 restaurants seulement — et vous pouvez en faire partie.
        </p>
        <div className="inline-flex flex-col items-center gap-0.5 px-6 py-3 rounded-2xl"
          style={{ backgroundColor: TEXT_PRO, color: '#FFFFFF' }}>
          <span className="text-base font-black">
            {placesLeft > 0 ? `${placesLeft} place${placesLeft > 1 ? 's' : ''} restante${placesLeft > 1 ? 's' : ''} sur 15` : 'Toutes les places sont prises'}
          </span>
          {taken !== null && taken > 0 && (
            <span className="text-xs opacity-80">{taken} restaurant{taken > 1 ? 's' : ''} déjà inscrite{taken > 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* OFFRE */}
      <div className="px-5 py-8">
        <p className="text-[10px] font-medium uppercase tracking-wide mb-5" style={{ color: TEXT_MUTED }}>Ce qui vous attend</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {OFFER_ITEMS.map(item => (
            <div key={item.title} className="rounded-2xl p-4 flex flex-col gap-2"
              style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: TEXT_PRO }}>
                <item.icon className="w-[18px] h-[18px] text-white" />
              </div>
              <p className="text-sm font-bold text-gray-900">{item.title}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{item.desc}</p>
              {item.price && (
                <div>
                  <p className="text-xl font-black" style={{ color: TEXT_PRO }}>{item.price}</p>
                  {item.oldPrice && <p className="text-xs text-gray-400 line-through">{item.oldPrice}</p>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="h-px" style={{ backgroundColor: BORDER }} />

      {/* TIMELINE */}
      <div className="px-5 py-8 max-w-xl mx-auto">
        <p className="text-[10px] font-medium uppercase tracking-wide mb-5" style={{ color: TEXT_MUTED }}>Comment ça se passe</p>
        <div className="flex flex-col gap-4">
          {TIMELINE.map((t, i) => (
            <div key={t.heading} ref={el => { timelineRefs.current[i] = el }} data-index={i} className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-black transition-colors duration-500"
                style={{
                  backgroundColor: i <= activeTimelineStep ? TEXT_PRO : '#E5E7EB',
                  color: i <= activeTimelineStep ? '#FFFFFF' : '#9CA3AF',
                }}>
                {i + 1}
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 mb-0.5">{t.heading}</p>
                <p className="text-xs leading-relaxed" style={{ color: TEXT_SECONDARY }}>{t.body}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FORMULAIRE / CONFIRMATION */}
      {submitted ? (
        <div className="px-5 py-10 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Vous êtes le restaurant #{placeNumber} !</h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Votre demande a bien été reçue. Nous vous contacterons sur WhatsApp sous 24h pour confirmer votre inscription et vous expliquer la suite.
          </p>
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-xl text-white" style={{ backgroundColor: TEXT_PRO }}>
            Retour à l&apos;accueil
          </Link>
        </div>
      ) : formOpen ? (
        <div className="px-5 py-8 text-center" style={{ backgroundColor: SURFACE_2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
          <div className="max-w-md mx-auto">
            <h2 className="text-lg font-medium mb-1" style={{ color: TEXT_PRIMARY }}>Réserver ma place</h2>
            <p className="text-[13px] leading-relaxed mb-5" style={{ color: TEXT_SECONDARY }}>
              Remplissez votre fiche étape par étape. Ces informations serviront directement à créer votre restaurant.
            </p>
            <button onClick={openWizard}
              className="w-full py-5 rounded-2xl text-lg font-black text-white transition-all hover:opacity-90"
              style={{ backgroundColor: TEXT_PRO }}>
              {`Réserver ma place — ${placesLeft} restante${placesLeft > 1 ? 's' : ''}`}
            </button>
            <p className="text-[11px] text-center mt-2" style={{ color: TEXT_MUTED }}>
              Aucun paiement requis maintenant. On vous contacte sur WhatsApp sous 24h.
            </p>
          </div>
        </div>
      ) : null}

      {/* LISTE D'ATTENTE */}
      {!submitted && !formOpen && (
        <div className="px-5 py-8 text-center max-w-md mx-auto">
          <p className="text-sm font-bold mb-1" style={{ color: TEXT_PRIMARY }}>Toutes les places sont prises ?</p>
          {waitlistSubmitted ? (
            <p className="text-xs text-green-600 font-medium">Merci ! Nous vous préviendrons au lancement officiel.</p>
          ) : (
            <>
              <p className="text-xs leading-relaxed mb-4" style={{ color: TEXT_SECONDARY }}>
                Inscrivez votre WhatsApp. Vous serez les premiers à savoir quand TerangaLink ouvre officiellement.
              </p>
              <form onSubmit={handleWaitlist} className="flex flex-col gap-2">
                <input
                  type="text"
                  value={waitlistName}
                  onChange={e => setWaitlistName(e.target.value)}
                  placeholder="Votre nom"
                  className="rounded-lg px-3 py-2 text-xs"
                  style={inputStyle}
                />
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={waitlistPhone}
                    onChange={e => setWaitlistPhone(e.target.value)}
                    placeholder="Votre numéro WhatsApp"
                    className="flex-1 rounded-lg px-3 py-2 text-xs"
                    style={inputStyle}
                  />
                  <button type="submit"
                    className="px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap"
                    style={{ backgroundColor: SURFACE_2, border: `1px solid ${BORDER_STRONG}`, color: TEXT_PRIMARY }}>
                    Me prévenir
                  </button>
                </div>
              </form>
            </>
          )}
        </div>
      )}

      <div className="h-px" style={{ backgroundColor: BORDER }} />

      {/* FOOTER NOTE */}
      <div className="px-5 py-6 text-center text-xs leading-relaxed" style={{ color: TEXT_MUTED }}>
        <strong style={{ color: TEXT_SECONDARY }}>TerangaLink</strong> — La plateforme des restaurateurs du Sénégal<br />
        Des questions ?{' '}
        <a href="https://wa.me/221774739266" target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: TEXT_PRO }}>
          Écrivez-nous sur WhatsApp
        </a>
      </div>

      {/* Wizard popup */}
      {wizardOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-3xl sm:rounded-2xl rounded-t-2xl max-h-[92vh] flex flex-col sm:flex-row overflow-hidden">
          <div className="flex flex-col flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0" style={{ borderBottom: `1px solid ${BORDER}` }}>
              <div>
                <p className="font-medium text-sm" style={{ color: TEXT_PRIMARY }}>Réserver ma place</p>
                <p className="text-[11px] mt-0.5" style={{ color: TEXT_MUTED }}>Étape {step}/{TOTAL_STEPS} — {STEP_LABELS[step - 1]}</p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setMobilePreviewOpen(true)}
                  className="sm:hidden flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 rounded-lg"
                  style={{ border: `1px solid ${BORDER_STRONG}`, color: TEXT_PRIMARY }}>
                  <Eye className="w-3.5 h-3.5" />
                  Prévisualiser
                </button>
                <button onClick={closeWizard} className="p-1.5 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" style={{ color: TEXT_MUTED }} />
                </button>
              </div>
            </div>

            {/* Step indicator */}
            <div className="flex gap-1.5 px-5 pt-4 flex-shrink-0">
              {STEP_LABELS.map((label, i) => (
                <div key={label} className="flex-1 h-1 rounded-full transition-colors"
                  style={{ backgroundColor: i + 1 <= step ? TEXT_PRO : BORDER }} />
              ))}
            </div>

            {/* Body */}
            <div className="px-5 py-5 overflow-y-auto overflow-x-hidden flex-1">
              {step === 1 && (
                <>
                  <FieldGroup label="Nom du restaurant">
                    <input value={form.restaurant_name} onChange={e => set('restaurant_name', e.target.value)} required
                      placeholder="ex : Fatou Mode, Bijoux Dakar..." className={inputClass} style={inputStyle} />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldGroup label="Catégorie">
                      <select value={form.cuisine_type} onChange={e => set('cuisine_type', e.target.value)} required className={inputClass} style={inputStyle}>
                        {CUISINE_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                      </select>
                    </FieldGroup>
                    <FieldGroup label="Ville">
                      <input value={form.city} onChange={e => set('city', e.target.value)} required
                        placeholder="Dakar, Thiès..." className={inputClass} style={inputStyle} />
                    </FieldGroup>
                  </div>
                  <FieldGroup label="Description de votre restaurant" hint="Ce texte apparaîtra sur votre vitrine.">
                    <textarea value={form.description} onChange={e => set('description', e.target.value)} rows={3}
                      placeholder="Décrivez ce que vous vendez, votre style, votre clientèle..."
                      className={inputClass + ' resize-none'} style={inputStyle} />
                  </FieldGroup>
                </>
              )}

              {step === 2 && (
                <>
                  <FieldGroup label="Logo" hint="Format carré, JPG ou PNG, max 5 Mo.">
                    <UploadZone icon={ImageIcon} label="Ajouter votre logo" hint="Cliquez pour choisir un fichier"
                      preview={logoPreview} onChange={f => previewFile(f, setLogoFile, setLogoPreview)} />
                  </FieldGroup>
                  <FieldGroup label="Bannière / image de couverture" hint="Format paysage recommandé, JPG ou PNG, max 10 Mo.">
                    <UploadZone icon={Images} label="Ajouter votre bannière" hint="Cliquez pour choisir un fichier"
                      preview={coverPreview} onChange={f => previewFile(f, setCoverFile, setCoverPreview)} />
                  </FieldGroup>
                </>
              )}

              {step === 3 && (
                <>
                  <FieldGroup label="Votre nom complet">
                    <input value={form.owner_name} onChange={e => set('owner_name', e.target.value)} required
                      placeholder="Prénom et nom" className={inputClass} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="Email">
                    <input value={form.email} onChange={e => set('email', e.target.value)} type="email" required
                      placeholder="votre@email.com" className={inputClass} style={inputStyle} />
                  </FieldGroup>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldGroup label="Téléphone">
                      <input value={form.phone} onChange={e => set('phone', e.target.value)} type="tel" required
                        placeholder="+221..." className={inputClass} style={inputStyle} />
                    </FieldGroup>
                    <FieldGroup label="WhatsApp commandes">
                      <input value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} type="tel" required
                        placeholder="+221..." className={inputClass} style={inputStyle} />
                    </FieldGroup>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <p className="text-xs font-medium mb-2" style={{ color: TEXT_SECONDARY }}>Couleur d&apos;accent</p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {COLOR_PALETTE.map(c => (
                      <button key={c} type="button" onClick={() => set('primary_color', c)}
                        className="w-8 h-8 rounded-full border-2 transition-all"
                        style={{ backgroundColor: c, borderColor: form.primary_color === c ? TEXT_PRIMARY : 'transparent' }} />
                    ))}
                  </div>

                  <p className="text-xs font-medium mb-2" style={{ color: TEXT_SECONDARY }}>Thème</p>
                  <div className="flex gap-2 mb-5">
                    {THEMES.map(t => (
                      <button key={t.value} type="button" onClick={() => set('theme', t.value)}
                        className="flex-1 py-2.5 rounded-lg text-xs font-medium border-2 transition-all"
                        style={{
                          borderColor: form.theme === t.value ? TEXT_PRO : BORDER_STRONG,
                          backgroundColor: t.bg === 'accent' ? form.primary_color : t.bg,
                          color: t.text,
                        }}>
                        {t.label}
                      </button>
                    ))}
                  </div>

                </>
              )}

              {step === 5 && (
                <div className="grid grid-cols-2 gap-2.5">
                  <FieldGroup label="Numéro Wave">
                    <input value={form.wave_number} onChange={e => set('wave_number', e.target.value)} type="tel"
                      placeholder="+221..." className={inputClass} style={inputStyle} />
                  </FieldGroup>
                  <FieldGroup label="Orange Money">
                    <input value={form.orange_money_number} onChange={e => set('orange_money_number', e.target.value)} type="tel"
                      placeholder="+221..." className={inputClass} style={inputStyle} />
                  </FieldGroup>
                </div>
              )}

              {step === 6 && (
                <>
                  <p className="text-[11px] mb-3" style={{ color: TEXT_MUTED }}>Optionnel</p>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldGroup label="Instagram">
                      <input value={form.instagram_url} onChange={e => set('instagram_url', e.target.value)}
                        placeholder="@votrerestaurant" className={inputClass} style={inputStyle} />
                    </FieldGroup>
                    <FieldGroup label="TikTok">
                      <input value={form.tiktok_url} onChange={e => set('tiktok_url', e.target.value)}
                        placeholder="@votrerestaurant" className={inputClass} style={inputStyle} />
                    </FieldGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <FieldGroup label="Facebook">
                      <input value={form.facebook_url} onChange={e => set('facebook_url', e.target.value)}
                        placeholder="facebook.com/..." className={inputClass} style={inputStyle} />
                    </FieldGroup>
                    <FieldGroup label="Snapchat">
                      <input value={form.snapchat_url} onChange={e => set('snapchat_url', e.target.value)}
                        placeholder="@nom d'utilisateur" className={inputClass} style={inputStyle} />
                    </FieldGroup>
                  </div>
                </>
              )}

              {step === 7 && (
                <div>
                  <p className="text-sm font-medium mb-3" style={{ color: TEXT_PRIMARY }}>Autorisations & consentements</p>
                  <label className="flex items-start gap-2.5 cursor-pointer mb-3">
                    <input type="checkbox" checked={form.consent_images}
                      onChange={e => set('consent_images', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0" />
                    <span className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                      <span className="font-medium text-red-500">*</span> J&apos;autorise TerangaLink à utiliser les photos et visuels de mon restaurant (logo, bannière, plats) pour des publications organiques et des publicités payantes sur les réseaux sociaux.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer mb-3">
                    <input type="checkbox" checked={form.consent_annuaire}
                      onChange={e => set('consent_annuaire', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0" />
                    <span className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                      <span className="font-medium text-red-500">*</span> J&apos;accepte d&apos;être référencé(e) dans l&apos;annuaire public de TerangaLink et que mes informations professionnelles soient visibles par tous les utilisateurs.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={form.consent_marketing}
                      onChange={e => set('consent_marketing', e.target.checked)}
                      className="w-4 h-4 mt-0.5 accent-brand-orange shrink-0" />
                    <span className="text-[13px] leading-relaxed" style={{ color: TEXT_SECONDARY }}>
                      J&apos;accepte de recevoir des conseils et offres partenaires par email ou WhatsApp. <span style={{ color: TEXT_MUTED }}>(optionnel)</span>
                    </span>
                  </label>
                  <p className="text-[11px] mt-3" style={{ color: TEXT_MUTED }}>Les champs marqués <span className="text-red-500">*</span> sont obligatoires.</p>
                </div>
              )}

              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
            </div>

            {/* Footer nav */}
            <div className="flex gap-3 px-5 py-4 flex-shrink-0" style={{ borderTop: `1px solid ${BORDER}` }}>
              {step > 1 && (
                <button onClick={() => setStep(s => s - 1)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium hover:bg-gray-50 transition-colors"
                  style={{ border: `1px solid ${BORDER_STRONG}`, color: TEXT_PRIMARY }}>
                  <ArrowLeft className="w-4 h-4" /> Précédent
                </button>
              )}
              {step < TOTAL_STEPS ? (
                <button onClick={() => canGoNext() && setStep(s => s + 1)} disabled={!canGoNext()}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: TEXT_PRO }}>
                  Suivant <ArrowRight className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={handleSubmit} disabled={loading || !form.consent_images || !form.consent_annuaire}
                  className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: TEXT_PRO }}>
                  {loading ? 'Envoi en cours...' : <>Réserver ma place <Check className="w-4 h-4" /></>}
                </button>
              )}
            </div>
          </div>

          {/* Preview live desktop */}
          <div className="hidden sm:block w-[300px] flex-shrink-0 p-5 overflow-y-auto overflow-x-hidden" style={{ borderLeft: `1px solid ${BORDER}` }}>
            <p className="text-[11px] font-medium uppercase tracking-wide mb-3" style={{ color: TEXT_MUTED }}>Aperçu en direct</p>
            <RestaurantLivePreview
              name={form.restaurant_name}
              category={form.cuisine_type}
              city={form.city}
              logoUrl={logoPreview || undefined}
              coverUrl={coverPreview || undefined}
              primaryColor={form.primary_color}
              theme={form.theme}
            />
          </div>
          </div>
        </div>
      )}

      {/* Preview mobile en overlay par-dessus la modal */}
      {mobilePreviewOpen && (
        <div className="fixed inset-0 z-[60] bg-black/60 flex items-end justify-center p-0"
          onClick={() => setMobilePreviewOpen(false)}>
          <div className="bg-white w-full rounded-t-2xl max-h-[92vh] overflow-y-auto overflow-x-hidden p-4" onClick={e => e.stopPropagation()}>
            <div className="flex justify-end mb-2">
              <button onClick={() => setMobilePreviewOpen(false)} aria-label="Fermer"><X className="w-5 h-5" style={{ color: TEXT_MUTED }} /></button>
            </div>
            <RestaurantLivePreview
              name={form.restaurant_name}
              category={form.cuisine_type}
              city={form.city}
              logoUrl={logoPreview || undefined}
              coverUrl={coverPreview || undefined}
              primaryColor={form.primary_color}
              theme={form.theme}
            />
          </div>
        </div>
      )}
    </div>
  )
}
