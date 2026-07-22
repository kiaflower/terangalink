'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { RestaurantRowActions } from './RestaurantRowActions'
import { CUISINE_OPTIONS } from '@/lib/cuisines'
import { slugify } from '@/lib/utils'
import { fileToCompressedBase64 } from '@/lib/imageUtils'
import {
  PlusCircle, X, CheckCircle2, Copy, Upload, ExternalLink,
  RefreshCw, Store, User, Palette, Globe, ChevronRight,
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────── */

const COLOR_PALETTE = ['#F97316', '#2563EB', '#059669', '#DC2626', '#D97706', '#DB2777', '#0891B2', '#111111']
const THEMES = [
  { value: 'light', label: 'Clair', bg: '#FFFFFF', text: '#111111' },
  { value: 'dark', label: 'Sombre', bg: '#111111', text: '#FFFFFF' },
  { value: 'vibrant', label: 'Coloré', bg: '#F97316', text: '#FFFFFF' },
]
const PLAN_OPTIONS = [{ value: 'free', label: 'Free' }, { value: 'starter', label: 'Starter' }, { value: 'pro', label: 'Pro' }]

function generatePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
  let p = ''
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)]
  return p
}

const iCls = 'w-full bg-white border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors placeholder-gray-400'
const lCls = 'block text-xs font-medium text-gray-500 mb-1.5'

/* ─── mini preview ───────────────────────────────────── */

function RestaurantPreview({ name, color, theme, logoUrl, coverUrl }: { name: string; color: string; theme: string; logoUrl?: string; coverUrl?: string }) {
  const bg = theme === 'dark' ? '#111111' : theme === 'vibrant' ? color : '#FFFFFF'
  const text = theme === 'dark' || theme === 'vibrant' ? '#FFFFFF' : '#111111'
  const cardBg = theme === 'dark' ? '#1A1A1A' : '#F9FAFB'
  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 text-sm shadow-sm" style={{ backgroundColor: bg }}>
      <p className="text-[10px] text-gray-400 px-3 pt-2.5 pb-0.5 font-medium uppercase tracking-wider">Aperçu vitrine</p>
      <div className="h-16 relative" style={{ backgroundColor: coverUrl ? undefined : color + '22' }}>
        {coverUrl && <img src={coverUrl} alt="" className="w-full h-full object-cover" />}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />
        <div className="absolute bottom-1.5 left-2.5 w-8 h-8 rounded-xl border-2 border-white shadow overflow-hidden" style={{ backgroundColor: color }}>
          {logoUrl ? <img src={logoUrl} alt="" className="w-full h-full object-cover" /> : <span className="flex items-center justify-center h-full text-white font-bold text-xs">{name.charAt(0) || 'T'}</span>}
        </div>
      </div>
      <div className="px-3 py-2.5">
        <p className="font-bold text-sm truncate" style={{ color: text }}>{name || 'Nom restaurant'}</p>
        <div className="grid grid-cols-2 gap-1.5 mt-2">
          {['Plat 1', 'Plat 2'].map(p => (
            <div key={p} className="rounded-xl p-2" style={{ backgroundColor: cardBg }}>
              <div className="h-7 rounded-lg mb-1" style={{ backgroundColor: color + '33' }} />
              <p className="text-[10px] font-bold truncate" style={{ color }}>5 000 FCFA</p>
            </div>
          ))}
        </div>
        <div className="mt-2 py-1.5 rounded-xl text-center text-[10px] font-bold text-white" style={{ backgroundColor: color }}>Commander</div>
      </div>
    </div>
  )
}

/* ─── CREATE RESTAURANT MODAL ──────────────────────────── */

interface CreateResult { email: string; password: string; slug: string; name: string }

function CreateRestaurantModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [step, setStep] = useState(1)
  const [form, setForm] = useState({
    // Restaurant info
    name: '', slug: '', description: '', cuisine_type: '', city: 'Dakar',
    whatsapp_number: '', phone: '',
    // Socials
    facebook_url: '', instagram_url: '', tiktok_url: '', snapchat_url: '',
    // Payments
    wave_number: '', orange_money_number: '',
    // Delivery
    delivery_info: '',
    // Visuals
    primary_color: '#F97316', theme: 'light', logo_url: '', cover_url: '',
    // Admin
    admin_full_name: '', admin_email: '', admin_password: generatePassword(), plan: 'starter',
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState<CreateResult | null>(null)
  const [copied, setCopied] = useState(false)
  const [siteOrigin, setSiteOrigin] = useState('')

  useEffect(() => { setSiteOrigin(window.location.origin) }, [])

  function set<K extends keyof typeof form>(key: K, val: (typeof form)[K]) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleNameChange(v: string) {
    setForm(f => ({ ...f, name: v, slug: slugTouched ? f.slug : slugify(v) }))
  }

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const b = await fileToCompressedBase64(file, 500); setLogoPreview(b); set('logo_url', b)
  }
  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    const b = await fileToCompressedBase64(file, 1200); setCoverPreview(b); set('cover_url', b)
  }

  async function handleSubmit() {
    setLoading(true); setError('')
    try {
      const payload = form.plan === 'pro' ? form : { ...form, primary_color: '#F97316', theme: 'light' }
      const res = await fetch('/api/super-admin/create-restaurant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'Erreur'); setLoading(false); return }
      setResult({ email: form.admin_email, password: form.admin_password, slug: data.restaurant.slug, name: data.restaurant.name })
      setLoading(false)
      onCreated()
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setLoading(false)
    }
  }

  function copyCredentials() {
    navigator.clipboard.writeText(`Email: ${result?.email}\nMot de passe: ${result?.password}\nLien: ${window.location.origin}/${result?.slug}`)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  const steps = [
    { id: 1, label: 'Restaurant', icon: Store },
    { id: 2, label: 'Visuels', icon: Palette },
    { id: 3, label: 'Réseaux', icon: Globe },
    { id: 4, label: 'Admin', icon: User },
  ]

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl w-full max-w-5xl max-h-[95vh] flex flex-col shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Créer un restaurant</h2>
            <p className="text-xs text-gray-400 mt-0.5">Onboardez un restaurant complète en quelques étapes</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-gray-100 transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Steps */}
        {!result && (
          <div className="flex items-center gap-0 px-6 py-3" style={{ borderBottom: '1px solid #F3F4F6' }}>
            {steps.map((s, i) => (
              <div key={s.id} className="flex items-center">
                <button onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${step === s.id ? 'bg-brand-orange/10 text-brand-orange' : step > s.id ? 'text-green-600' : 'text-gray-400'}`}>
                  <s.icon className="w-3.5 h-3.5" />
                  {s.label}
                </button>
                {i < steps.length - 1 && <ChevronRight className="w-3.5 h-3.5 text-gray-300 mx-0.5" />}
              </div>
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {result ? (
            /* Success screen */
            <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
              <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mb-4">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{result.name} créée !</h3>
              <p className="text-gray-500 text-sm mb-6">Communiquez ces identifiants à l&apos;admin de le restaurant.</p>
              <div className="bg-gray-50 border border-gray-200 rounded-2xl p-6 w-full max-w-sm text-left space-y-3 mb-6">
                <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Email</p><p className="text-sm font-medium text-gray-900">{result.email}</p></div>
                <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Mot de passe</p><p className="text-sm font-mono font-bold text-brand-orange">{result.password}</p></div>
                <div><p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Lien vitrine</p>
                  <Link href={`/${result.slug}`} target="_blank" className="text-sm text-brand-orange flex items-center gap-1">/{result.slug}<ExternalLink className="w-3 h-3" /></Link>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={copyCredentials}
                  className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
                  <Copy className="w-4 h-4" />
                  {copied ? 'Copié !' : 'Copier les identifiants'}
                </button>
                <button onClick={onClose}
                  className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-medium px-5 py-2.5 rounded-xl hover:bg-brand-orange-dark transition-colors">
                  Fermer
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 h-full">
              {/* Form area */}
              <div className="lg:col-span-2 p-6 space-y-5">

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
                )}

                {/* STEP 1 — Restaurant info */}
                {step === 1 && (
                  <div className="space-y-5">
                    <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Store className="w-4 h-4 text-brand-orange" />Identité</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="sm:col-span-2">
                          <label className={lCls}>Nom de le restaurant *</label>
                          <input type="text" required value={form.name} onChange={e => handleNameChange(e.target.value)} placeholder="Chez Mariama" className={iCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={lCls}>Slug (URL) *</label>
                          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-brand-orange focus-within:ring-1 focus-within:ring-brand-orange/20 transition-colors">
                            <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">{siteOrigin.replace(/^https?:\/\//, '')}/</span>
                            <input type="text" required value={form.slug}
                              onChange={e => { setSlugTouched(true); set('slug', e.target.value) }}
                              placeholder="chez-mariama"
                              className="flex-1 px-3 py-2.5 text-sm text-gray-900 focus:outline-none bg-white" />
                          </div>
                        </div>
                        <div>
                          <label className={lCls}>Catégorie</label>
                          <select value={form.cuisine_type} onChange={e => set('cuisine_type', e.target.value)} className={iCls}>
                            {CUISINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                          </select>
                        </div>
                        <div>
                          <label className={lCls}>Ville</label>
                          <input type="text" value={form.city} onChange={e => set('city', e.target.value)} placeholder="Dakar" className={iCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={lCls}>Description</label>
                          <textarea rows={2} value={form.description} onChange={e => set('description', e.target.value)}
                            placeholder="Présentation courte de le restaurant…"
                            className={`${iCls} resize-none`} />
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 space-y-3">
                      <h3 className="text-sm font-semibold text-gray-900">Contact &amp; paiements</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className={lCls}>WhatsApp *</label>
                          <input type="tel" required value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)} placeholder="+221 77 000 00 00" className={iCls} />
                        </div>
                        <div>
                          <label className={lCls}>Téléphone</label>
                          <input type="tel" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+221 33 000 00 00" className={iCls} />
                        </div>
                        <div>
                          <label className={lCls}>Wave</label>
                          <input type="tel" value={form.wave_number} onChange={e => set('wave_number', e.target.value)} placeholder="+221 77 000 00 00" className={iCls} />
                        </div>
                        <div>
                          <label className={lCls}>Orange Money</label>
                          <input type="tel" value={form.orange_money_number} onChange={e => set('orange_money_number', e.target.value)} placeholder="+221 77 000 00 00" className={iCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={lCls}>Livraison / conditions</label>
                          <input type="text" value={form.delivery_info} onChange={e => set('delivery_info', e.target.value)} placeholder="Livraison Dakar 1500 FCFA, 24h" className={iCls} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className={lCls}>Plan</label>
                          <div className="flex gap-2">
                            {PLAN_OPTIONS.map(o => (
                              <button key={o.value} type="button" onClick={() => set('plan', o.value)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                                style={{ borderColor: form.plan === o.value ? '#F97316' : '#E5E7EB', backgroundColor: form.plan === o.value ? '#F97316' : '#F9FAFB', color: form.plan === o.value ? '#FFF' : '#374151' }}>
                                {o.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 2 — Visuels & couleurs */}
                {step === 2 && (
                  <div className="space-y-5">
                    <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                      <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Upload className="w-4 h-4 text-brand-orange" />Logo &amp; bannière</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className={lCls}>Logo</label>
                          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-brand-orange/40 transition-colors min-h-[100px]">
                            {logoPreview
                              ? <img src={logoPreview} alt="" className="w-16 h-16 rounded-xl object-cover" />
                              : <><Upload className="w-6 h-6 text-gray-300" /><span className="text-xs text-gray-400">Uploader</span></>}
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                          </label>
                        </div>
                        <div>
                          <label className={lCls}>Bannière</label>
                          <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-brand-orange/40 transition-colors min-h-[100px]">
                            {coverPreview
                              ? <img src={coverPreview} alt="" className="w-full h-20 rounded-xl object-cover" />
                              : <><Upload className="w-6 h-6 text-gray-300" /><span className="text-xs text-gray-400">16:9 recommandé</span></>}
                            <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                          </label>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Palette className="w-4 h-4 text-brand-orange" />Couleur &amp; thème</h3>
                        {form.plan !== 'pro' && (
                          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            Réservé au plan Pro
                          </span>
                        )}
                      </div>
                      {form.plan !== 'pro' && (
                        <p className="text-xs text-gray-400">
                          Plan Starter sélectionné : le restaurant gardera les couleurs et le thème par défaut de TerangaLink.
                        </p>
                      )}
                      <fieldset disabled={form.plan !== 'pro'} className={form.plan !== 'pro' ? 'opacity-40 pointer-events-none' : ''}>
                        <div>
                          <label className={lCls}>Couleur principale</label>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {COLOR_PALETTE.map(c => (
                              <button key={c} type="button" onClick={() => set('primary_color', c)}
                                className="w-8 h-8 rounded-lg border-2 transition-all"
                                style={{ backgroundColor: c, borderColor: form.primary_color === c ? '#F97316' : 'transparent', transform: form.primary_color === c ? 'scale(1.15)' : 'scale(1)' }} />
                            ))}
                            <input type="color" value={form.primary_color} onChange={e => set('primary_color', e.target.value)}
                              className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200" title="Personnalisée" />
                          </div>
                        </div>
                        <div>
                          <label className={lCls}>Thème</label>
                          <div className="flex gap-2">
                            {THEMES.map(t => (
                              <button key={t.value} type="button" onClick={() => set('theme', t.value)}
                                className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                                style={{
                                  borderColor: form.theme === t.value ? '#F97316' : '#E5E7EB',
                                  backgroundColor: t.bg === '#F97316' ? form.primary_color : t.bg,
                                  color: t.text,
                                }}>
                                {t.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </fieldset>
                    </div>
                  </div>
                )}

                {/* STEP 3 — Réseaux sociaux */}
                {step === 3 && (
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><Globe className="w-4 h-4 text-brand-orange" />Réseaux sociaux</h3>
                    <p className="text-xs text-gray-400">Ces liens apparaîtront dans le footer de la vitrine restaurant.</p>
                    {[
                      { key: 'facebook_url' as const, label: 'Facebook', placeholder: 'https://facebook.com/marestaurant' },
                      { key: 'instagram_url' as const, label: 'Instagram', placeholder: 'https://instagram.com/marestaurant' },
                      { key: 'tiktok_url' as const, label: 'TikTok', placeholder: 'https://tiktok.com/@marestaurant' },
                      { key: 'snapchat_url' as const, label: 'Snapchat', placeholder: 'https://snapchat.com/add/marestaurant' },
                    ].map(({ key, label, placeholder }) => (
                      <div key={key}>
                        <label className={lCls}>{label}</label>
                        <input type="url" value={form[key]} onChange={e => set(key, e.target.value)} placeholder={placeholder} className={iCls} />
                      </div>
                    ))}
                  </div>
                )}

                {/* STEP 4 — Admin */}
                {step === 4 && (
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2"><User className="w-4 h-4 text-brand-orange" />Administrateur</h3>
                    <div>
                      <label className={lCls}>Nom complet *</label>
                      <input type="text" required value={form.admin_full_name} onChange={e => set('admin_full_name', e.target.value)} placeholder="Aminata Diallo" className={iCls} />
                    </div>
                    <div>
                      <label className={lCls}>Email *</label>
                      <input type="email" required value={form.admin_email} onChange={e => set('admin_email', e.target.value)} placeholder="admin@restaurant.com" className={iCls} />
                    </div>
                    <div>
                      <label className={lCls}>Mot de passe (auto-généré)</label>
                      <div className="flex gap-2">
                        <input type="text" required minLength={8} value={form.admin_password} onChange={e => set('admin_password', e.target.value)}
                          className={`${iCls} font-mono flex-1`} />
                        <button type="button" onClick={() => set('admin_password', generatePassword())}
                          className="px-3 py-2.5 border border-gray-200 rounded-xl text-xs text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap">
                          Regénérer
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>

              {/* Preview panel */}
              <div className="hidden lg:block p-6 border-l border-gray-100 bg-gray-50/50">
                <p className="text-xs font-medium text-gray-400 mb-3 uppercase tracking-wider">Aperçu en direct</p>
                <RestaurantPreview
                  name={form.name}
                  color={form.plan === 'pro' ? form.primary_color : '#F97316'}
                  theme={form.plan === 'pro' ? form.theme : 'light'}
                  logoUrl={logoPreview || undefined}
                  coverUrl={coverPreview || undefined}
                />
                {form.name && (
                  <div className="mt-4 space-y-1.5">
                    {form.city && <p className="text-xs text-gray-500">📍 {form.city}</p>}
                    {form.cuisine_type && <p className="text-xs text-gray-500">🏪 {form.cuisine_type}</p>}
                    {form.whatsapp_number && <p className="text-xs text-gray-500">💬 {form.whatsapp_number}</p>}
                    {form.plan && <p className="text-xs text-gray-500">⭐ Plan {form.plan}</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer nav */}
        {!result && (
          <div className="flex items-center justify-between px-6 py-4" style={{ borderTop: '1px solid #F3F4F6' }}>
            <button onClick={() => step > 1 ? setStep(s => s - 1) : onClose()}
              className="text-sm text-gray-500 hover:text-gray-900 transition-colors px-4 py-2.5 rounded-xl hover:bg-gray-100">
              {step > 1 ? '← Précédent' : 'Annuler'}
            </button>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4].map(s => (
                <button key={s} onClick={() => setStep(s)}
                  className="w-2 h-2 rounded-full transition-all"
                  style={{ backgroundColor: step === s ? '#F97316' : '#E5E7EB', transform: step === s ? 'scale(1.3)' : 'scale(1)' }} />
              ))}
            </div>
            {step < 4 ? (
              <button onClick={() => setStep(s => s + 1)}
                className="bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-orange-dark transition-colors">
                Suivant →
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !form.name || !form.whatsapp_number || !form.admin_email || !form.admin_full_name}
                className="bg-brand-orange text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                {loading ? 'Création…' : 'Créer le restaurant'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── RESTAURANTS LIST PAGE ────────────────────────────── */

interface Restaurant {
  id: string
  name: string
  slug: string
  cuisine_type: string | null
  city: string | null
  is_active: boolean
  primary_color: string | null
  logo_url: string | null
  created_at: string
  plan: 'free' | 'starter' | 'pro' | null
  lastReportSentAt: string | null
}

const PLAN_BADGE_STYLE: Record<string, { bg: string; text: string }> = {
  free: { bg: '#F3F4F6', text: '#4B5563' },
  starter: { bg: '#EDE9FE', text: '#C2410C' },
  pro: { bg: '#F97316', text: '#FFFFFF' },
}
const PLAN_LABEL: Record<string, string> = { free: 'Free', starter: 'Starter', pro: 'Pro' }

function PlanBadge({ plan }: { plan: string | null }) {
  if (!plan) return null
  const style = PLAN_BADGE_STYLE[plan] ?? PLAN_BADGE_STYLE.starter
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: style.bg, color: style.text }}>
      {PLAN_LABEL[plan] ?? plan}
    </span>
  )
}

export default function SuperAdminRestaurantsPage() {
  const supabase = createClient()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [search, setSearch] = useState('')

  const fetchRestaurants = useCallback(async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('id, name, slug, cuisine_type, city, is_active, primary_color, logo_url, created_at, subscriptions(plan)')
      .order('created_at', { ascending: false })
      .limit(200)
    const rows = (data ?? []) as unknown as Array<Omit<Restaurant, 'plan' | 'lastReportSentAt'> & { subscriptions: { plan: string } | { plan: string }[] | null }>

    const { data: reports } = await supabase
      .from('weekly_reports')
      .select('restaurant_id, sent_at')
      .order('sent_at', { ascending: false })
      .limit(1000)
    const lastReportByRestaurant = new Map<string, string>()
    for (const r of (reports ?? []) as Array<{ restaurant_id: string; sent_at: string }>) {
      if (!lastReportByRestaurant.has(r.restaurant_id)) lastReportByRestaurant.set(r.restaurant_id, r.sent_at)
    }

    setRestaurants(rows.map(b => {
      const sub = Array.isArray(b.subscriptions) ? b.subscriptions[0] : b.subscriptions
      return { ...b, plan: (sub?.plan as Restaurant['plan']) ?? null, lastReportSentAt: lastReportByRestaurant.get(b.id) ?? null }
    }))
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchRestaurants()
    const channel = supabase
      .channel('restaurants-list')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'restaurants' }, fetchRestaurants)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [fetchRestaurants])

  const filtered = restaurants.filter(b =>
    !search || b.name.toLowerCase().includes(search.toLowerCase()) || b.slug.includes(search.toLowerCase()) || (b.city ?? '').toLowerCase().includes(search.toLowerCase())
  )

  const planCounts = restaurants.reduce((acc, b) => {
    if (b.plan) acc[b.plan] = (acc[b.plan] ?? 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div>
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurants</h1>
          <p className="text-gray-500 text-sm mt-0.5">{restaurants.length} restaurant{restaurants.length !== 1 ? 's' : ''} enregistrée{restaurants.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={fetchRestaurants} className="p-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <PlusCircle className="w-4 h-4" />
            Créer un restaurant
          </button>
        </div>
      </div>

      {/* Répartition par plan */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {(['free', 'starter', 'pro'] as const).map(p => (
          <span key={p} className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white">
            <PlanBadge plan={p} />
            {planCounts[p] ?? 0}
          </span>
        ))}
      </div>

      {/* Search */}
      <div className="mb-4">
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par nom, slug, ville…"
          className="w-full sm:w-80 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors" />
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
        {loading ? (
          <div className="space-y-0">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="p-4 flex items-center gap-4 border-b border-gray-100 animate-pulse">
                <div className="w-9 h-9 rounded-lg bg-gray-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-gray-100 rounded w-32" />
                  <div className="h-2.5 bg-gray-50 rounded w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-500 py-20 text-sm">
            {search ? 'Aucun restaurant trouvée' : 'Aucun restaurant'}
          </p>
        ) : (
          filtered.map((b, i) => (
            <div key={b.id} className={`p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 ${i < filtered.length - 1 ? 'border-b border-gray-100' : ''}`}>
              <div className="flex items-center gap-3 min-w-0 flex-1">
                {/* Logo */}
                <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0 overflow-hidden"
                  style={{ backgroundColor: b.primary_color || '#F97316' }}>
                  {b.logo_url
                    ? <img src={b.logo_url} alt="" className="w-full h-full object-cover" />
                    : b.name.charAt(0)}
                </div>
                {/* Info */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-gray-900 truncate">{b.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5 truncate">
                    {[b.cuisine_type, b.city, `/${b.slug}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
              </div>
              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 sm:shrink-0">
                <PlanBadge plan={b.plan} />
                <StatusBadge status={b.is_active ? 'active' : 'inactive'} />
                <Link href={`/${b.slug}`} target="_blank"
                  className="flex items-center gap-1 text-xs text-brand-orange hover:text-brand-orange-dark transition-colors">
                  Voir <ExternalLink className="w-3 h-3" />
                </Link>
                <RestaurantRowActions
                  restaurantId={b.id}
                  restaurantName={b.name}
                  isActive={b.is_active}
                  onToggled={(id, newIsActive) => setRestaurants(prev => prev.map(x => x.id === id ? { ...x, is_active: newIsActive } : x))}
                  lastReportSentAt={b.lastReportSentAt}
                  onReportSent={(id, sentAt) => setRestaurants(prev => prev.map(x => x.id === id ? { ...x, lastReportSentAt: sentAt } : x))}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {createOpen && (
        <CreateRestaurantModal
          onClose={() => setCreateOpen(false)}
          onCreated={fetchRestaurants}
        />
      )}
    </div>
  )
}
