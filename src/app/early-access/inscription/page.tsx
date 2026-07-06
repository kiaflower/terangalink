'use client'

import { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, ArrowRight, Check, Upload, X,
  Zap, Store, MapPin, Camera, Share2, ClipboardCheck, CreditCard, MessageCircle,
} from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

interface FormData {
  restaurantName: string; adminName: string; phone: string; whatsapp: string
  address: string; city: string; neighborhood: string
  waveNumber: string; orangeMoneyNumber: string
  logoUrl: string | null; bannerUrl: string | null
  colorChoice: 'terangalink' | 'custom'
  primaryColor: string; secondaryColor: string
  facebookUrl: string; instagramUrl: string; tiktokUrl: string; snapchatUrl: string
}

// ─── Composants UI stables ────────────────────────────────────────────────────

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
  value, onChange, placeholder, type = 'text', error,
}: {
  value: string; onChange: (v: string) => void; placeholder?: string
  type?: string; error?: string
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
      style={{ border: `1px solid ${error ? '#EF4444' : '#E5E7EB'}`, backgroundColor: '#F9FAFB', color: '#111111' }}
    />
  )
}

// ─── Constantes ───────────────────────────────────────────────────────────────

const STEPS = [
  { label: 'Compte', icon: Store },
  { label: 'Localisation', icon: MapPin },
  { label: 'Paiement', icon: CreditCard },
  { label: 'Visuels', icon: Camera },
  { label: 'Réseaux', icon: Share2 },
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
  restaurantName: '', adminName: '', phone: '', whatsapp: '',
  address: '', city: '', neighborhood: '',
  waveNumber: '', orangeMoneyNumber: '',
  logoUrl: null, bannerUrl: null,
  colorChoice: 'terangalink',
  primaryColor: '#F97316', secondaryColor: '#FED7AA',
  facebookUrl: '', instagramUrl: '', tiktokUrl: '', snapchatUrl: '',
}

// ─── Upload helper ────────────────────────────────────────────────────────────

async function uploadFile(supabase: ReturnType<typeof createClient>, file: File, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('menu-images').upload(path, file, { upsert: true })
  if (error) { console.error('Upload error:', error); return null }
  const { data: { publicUrl } } = supabase.storage.from('menu-images').getPublicUrl(data.path)
  return publicUrl
}

// ─── Composant principal ──────────────────────────────────────────────────────

export default function EarlyAccessInscriptionPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState<FormData>(INITIAL)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [remaining, setRemaining] = useState<number | null>(null)
  const logoRef = useRef<HTMLInputElement>(null)
  const bannerRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetch('/api/early-access').then(r => r.json()).then(data => setRemaining(data.remaining ?? null)).catch(() => {})
  }, [])

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
    setErrors(e => { const n = { ...e }; delete n[key]; return n })
  }

  function validate(): boolean {
    const e: Record<string, string> = {}
    if (step === 1) {
      if (!form.restaurantName.trim()) e.restaurantName = 'Requis'
      if (!form.adminName.trim()) e.adminName = 'Requis'
      if (!form.phone.trim()) e.phone = 'Requis'
      if (!form.whatsapp.trim()) e.whatsapp = 'Requis'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  function next() { if (validate()) setStep(s => Math.min(s + 1, STEPS.length)) }
  function prev() { setStep(s => Math.max(s - 1, 1)) }

  async function handleUpload(field: 'logoUrl' | 'bannerUrl', file: File) {
    setUploading(field)
    const path = `early-access/${Date.now()}-${file.name}`
    const url = await uploadFile(supabase, file, path)
    if (url) set(field, url)
    setUploading(null)
  }

  async function handleSubmit() {
    setSubmitting(true)
    const { error } = await supabase.from('early_access_registrations').insert({
      restaurant_name: form.restaurantName, admin_name: form.adminName,
      phone: form.phone, whatsapp: form.whatsapp,
      address: form.address || null, city: form.city || null, neighborhood: form.neighborhood || null,
      wave_number: form.waveNumber || null, orange_money_number: form.orangeMoneyNumber || null,
      logo_url: form.logoUrl, banner_url: form.bannerUrl,
      color_choice: form.colorChoice,
      primary_color: form.colorChoice === 'custom' ? form.primaryColor : null,
      secondary_color: form.colorChoice === 'custom' ? form.secondaryColor : null,
      facebook_url: form.facebookUrl || null, instagram_url: form.instagramUrl || null,
      tiktok_url: form.tiktokUrl || null, snapchat_url: form.snapchatUrl || null,
      status: 'pending',
    })
    setSubmitting(false)
    if (error) { alert("Erreur lors de l'envoi. Réessayez."); console.error(error); return }
    router.push('/early-access/merci')
  }

  if (remaining === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ backgroundColor: '#F9FAFB' }}>
        <div className="w-full max-w-md text-center">
          <h1 className="text-2xl font-black mb-3" style={{ color: '#111111' }}>Les inscriptions ne sont pas ouvertes</h1>
          <p className="text-sm mb-6" style={{ color: '#6B7280' }}>
            Rejoignez la liste d&apos;attente depuis la page Early Access pour être averti(e) dès qu&apos;une place se libère.
          </p>
          <Link href="/early-access" className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
            style={{ backgroundColor: '#F97316' }}>
            Retour à la page Early Access
          </Link>
        </div>
      </div>
    )
  }

  // ─── Rendu étapes ─────────────────────────────────────────────────────────

  function renderStep() {
    switch (step) {

      // ── Étape 1 : Compte ──────────────────────────────────────────────────
      case 1: return (
        <div className="space-y-4">
          <Field label="Nom du restaurant" error={errors.restaurantName}>
            <TInput value={form.restaurantName} onChange={v => set('restaurantName', v)} placeholder="Chez Teranga" error={errors.restaurantName} />
          </Field>
          <Field label="Nom du responsable" error={errors.adminName}>
            <TInput value={form.adminName} onChange={v => set('adminName', v)} placeholder="Fatou Diallo" error={errors.adminName} />
          </Field>
          <Field label="Numéro de téléphone principal" error={errors.phone}>
            <TInput value={form.phone} onChange={v => set('phone', v)} placeholder="771234567" error={errors.phone} />
          </Field>
          <Field label="Numéro WhatsApp" error={errors.whatsapp}>
            <TInput value={form.whatsapp} onChange={v => set('whatsapp', v)} placeholder="771234567 (si différent)" error={errors.whatsapp} />
          </Field>
        </div>
      )

      // ── Étape 2 : Localisation ────────────────────────────────────────────
      case 2: return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Ville"><TInput value={form.city} onChange={v => set('city', v)} placeholder="Dakar" /></Field>
            <Field label="Quartier"><TInput value={form.neighborhood} onChange={v => set('neighborhood', v)} placeholder="Castors" /></Field>
          </div>
          <Field label="Adresse"><TInput value={form.address} onChange={v => set('address', v)} placeholder="Rue 10, Plateau" /></Field>
        </div>
      )

      // ── Étape 3 : Paiement ────────────────────────────────────────────────
      case 3: return (
        <div className="space-y-4">
          <Field label="Numéro Wave"><TInput value={form.waveNumber} onChange={v => set('waveNumber', v)} placeholder="771234567" /></Field>
          <Field label="Numéro Orange Money"><TInput value={form.orangeMoneyNumber} onChange={v => set('orangeMoneyNumber', v)} placeholder="771234567" /></Field>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Ces numéros servent à recevoir les paiements de vos clients.</p>
        </div>
      )

      // ── Étape 4 : Visuels & couleurs ──────────────────────────────────────
      case 4: return (
        <div className="space-y-5">
          {([
            { label: 'Logo (carré, JPG/PNG)', field: 'logoUrl' as const, ref: logoRef },
            { label: 'Bannière (format paysage)', field: 'bannerUrl' as const, ref: bannerRef },
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

          <div className="rounded-2xl overflow-hidden" style={{ border: '2px solid #E5E7EB' }}>
            <div className="px-5 py-3" style={{ backgroundColor: '#FFF7ED', borderBottom: '1px solid #E5E7EB' }}>
              <p className="text-sm font-bold" style={{ color: '#111111' }}>🎨 Couleurs de votre page</p>
              <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>Inclus avec votre plan Pro Early Access</p>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                <button onClick={() => set('colorChoice', 'terangalink')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: form.colorChoice === 'terangalink' ? '#F97316' : '#F3F4F6',
                    color: form.colorChoice === 'terangalink' ? '#FFFFFF' : '#6B7280',
                  }}>
                  Laisser TerangaLink choisir
                </button>
                <button onClick={() => set('colorChoice', 'custom')}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    backgroundColor: form.colorChoice === 'custom' ? '#111111' : '#F3F4F6',
                    color: form.colorChoice === 'custom' ? '#FFFFFF' : '#6B7280',
                  }}>
                  Choisir mes couleurs
                </button>
              </div>
              {form.colorChoice === 'custom' && (
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
              )}
            </div>
          </div>
        </div>
      )

      // ── Étape 5 : Réseaux sociaux (optionnel) ─────────────────────────────
      case 5: return (
        <div className="space-y-4">
          <p className="text-xs" style={{ color: '#9CA3AF' }}>Ces champs sont optionnels.</p>
          <Field label="Instagram (optionnel)"><TInput value={form.instagramUrl} onChange={v => set('instagramUrl', v)} placeholder="https://instagram.com/votre-compte" /></Field>
          <Field label="Facebook (optionnel)"><TInput value={form.facebookUrl} onChange={v => set('facebookUrl', v)} placeholder="https://facebook.com/votre-page" /></Field>
          <Field label="TikTok (optionnel)"><TInput value={form.tiktokUrl} onChange={v => set('tiktokUrl', v)} placeholder="https://tiktok.com/@votre-compte" /></Field>
          <Field label="Snapchat (optionnel)"><TInput value={form.snapchatUrl} onChange={v => set('snapchatUrl', v)} placeholder="https://snapchat.com/add/votre-snap" /></Field>
        </div>
      )

      // ── Étape 6 : Validation ──────────────────────────────────────────────
      case 6: return (
        <div className="space-y-4">
          <div className="rounded-xl p-4 flex items-start gap-3" style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
            <Zap className="w-4 h-4 flex-shrink-0 mt-0.5" style={{ color: '#F97316' }} />
            <p className="text-xs" style={{ color: '#9A3412' }}>
              Plan Pro Early Access — <strong>12 900 FCFA/mois</strong> pendant 6 mois (au lieu de 19 900 FCFA/mois).
            </p>
          </div>
          <p className="text-sm" style={{ color: '#6B7280' }}>Vérifiez vos informations avant d&apos;envoyer votre demande.</p>
          {[
            { title: 'Compte', items: [['Restaurant', form.restaurantName], ['Responsable', form.adminName], ['Téléphone', form.phone], ['WhatsApp', form.whatsapp]] },
            { title: 'Localisation', items: [['Ville', form.city || '—'], ['Quartier', form.neighborhood || '—'], ['Adresse', form.address || '—']] },
            { title: 'Paiement', items: [['Wave', form.waveNumber || '—'], ['Orange Money', form.orangeMoneyNumber || '—']] },
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
        </div>
      )

      default: return null
    }
  }

  // ─── Rendu principal ──────────────────────────────────────────────────────

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F9FAFB' }}>
      <header className="px-4 py-4 flex items-center gap-3" style={{ backgroundColor: '#FFFFFF', borderBottom: '1px solid #E5E7EB' }}>
        <Link href="/early-access" className="text-gray-400 hover:text-gray-600 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <span className="font-bold text-lg" style={{ color: '#111111' }}>
          <span style={{ color: '#F97316' }}>Teranga</span>Link
        </span>
        <span className="text-sm" style={{ color: '#9CA3AF' }}>— Inscription Early Access</span>
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
          {step < STEPS.length ? (
            <button onClick={next} className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: '#F97316' }}>
              Suivant<ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleSubmit} disabled={submitting}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: '#F97316' }}>
              {submitting ? 'Envoi en cours...' : <><Check className="w-4 h-4" />Réserver ma place</>}
            </button>
          )}
        </div>

        <div className="mt-6 pt-5" style={{ borderTop: '1px solid #E5E7EB' }}>
          <p className="text-xs text-center mb-3" style={{ color: '#9CA3AF' }}>Besoin d&apos;aide ?</p>
          <div className="flex gap-2 justify-center">
            <a
              href="https://wa.me/221774739266?text=Bonjour%2C%20j%27ai%20besoin%20d%27aide%20pour%20mon%20inscription%20Early%20Access%20TerangaLink."
              target="_blank" rel="noopener noreferrer"
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
