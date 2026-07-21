'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { SHOP_CATEGORY_OPTIONS } from '@/lib/categories'
import { fileToCompressedBase64 } from '@/lib/imageUtils'
import { getBoutiqueTheme, withAlpha } from '@/lib/theme'
import { ArrowLeft, Upload, Plus, Trash2, UserCircle, RefreshCw } from 'lucide-react'

const THEMES = [
  { value: 'light', label: 'Clair', bg: '#FFFFFF', text: '#111111' },
  { value: 'dark', label: 'Sombre', bg: '#111111', text: '#FFFFFF' },
  { value: 'vibrant', label: 'Coloré', bg: 'var(--accent)', text: '#FFFFFF' },
]

const COLOR_PALETTE = [
  '#F97316', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#DB2777', '#0891B2', '#111111',
]

const inputClass = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors'
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'

function BoutiquePreview({ name, color, theme, logoUrl, coverUrl }: { name: string; color: string; theme: string; logoUrl?: string; coverUrl?: string }) {
  const { accent, pageBg: bg, pageText: text, cardBg } = getBoutiqueTheme({ primary_color: color, theme })

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 text-sm" style={{ backgroundColor: bg }}>
      <p className="text-[10px] text-gray-400 px-4 pt-3 pb-1 font-medium uppercase tracking-wider">Aperçu vitrine</p>
      <div className="h-20 relative flex-shrink-0" style={{ backgroundColor: coverUrl ? undefined : withAlpha(accent, '22') }}>
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.4) 100%)' }} />
        <div className="absolute bottom-2 left-3 w-9 h-9 rounded-xl border-2 border-white shadow-md overflow-hidden"
          style={{ backgroundColor: accent }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="flex items-center justify-center h-full text-white font-bold text-xs">{name.charAt(0) || 'T'}</span>
          )}
        </div>
      </div>
      <div className="px-4 py-3">
        <p className="font-bold text-sm" style={{ color: text }}>{name || 'Nom de la boutique'}</p>
        <div className="flex gap-1.5 mt-2">
          {['Tous', 'Nouveautés', 'Promos'].map(cat => (
            <span key={cat} className="text-[10px] px-2 py-0.5 rounded-full font-medium"
              style={{ backgroundColor: cat === 'Tous' ? accent : cardBg, color: cat === 'Tous' ? '#FFFFFF' : text + 'AA' }}>
              {cat}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 mt-3">
          {['Produit 1', 'Produit 2'].map(p => (
            <div key={p} className="rounded-xl p-2.5" style={{ backgroundColor: cardBg }}>
              <div className="h-10 rounded-lg mb-1.5" style={{ backgroundColor: withAlpha(accent, '33') }} />
              <p className="text-[10px] font-medium truncate" style={{ color: text }}>{p}</p>
              <p className="text-[10px] font-bold" style={{ color: accent }}> 5 000 FCFA</p>
            </div>
          ))}
        </div>
        <div className="mt-3 py-2 rounded-xl text-center text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>
          Commander sur WhatsApp
        </div>
      </div>
    </div>
  )
}

export default function EditBoutiquePage() {
  const params = useParams()
  const router = useRouter()
  const id = params.id as string
  const supabase = createClient()

  const [form, setForm] = useState({
    name: '', slug: '', city: '', shop_category: '', description: '',
    whatsapp_number: '', phone: '',
    facebook_url: '', instagram_url: '', tiktok_url: '', snapchat_url: '',
    wave_number: '', orange_money_number: '',
    delivery_info: '', show_delivery_info: false,
    is_verified: false, is_active: true, is_founder: false,
    primary_color: '#F97316', theme: 'light',
    logo_url: '', cover_url: '',
  })
  const [logoPreview, setLogoPreview] = useState('')
  const [coverPreview, setCoverPreview] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [siteOrigin, setSiteOrigin] = useState('')

  useEffect(() => { setSiteOrigin(window.location.origin) }, [])

  // Admins section
  interface AdminRow { id: string; full_name: string | null; email: string; created_at: string }
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [plan, setPlan] = useState<string>('starter')
  const [adminsLoading, setAdminsLoading] = useState(false)

  // Subscription section
  const [subForm, setSubForm] = useState({ id: '', plan: 'starter', status: 'trial', ends_at: '' })
  const [subSaving, setSubSaving] = useState(false)
  const [subError, setSubError] = useState('')
  const [subSuccess, setSubSuccess] = useState(false)
  const [deletingAdmin, setDeletingAdmin] = useState<string | null>(null)
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [addAdminForm, setAddAdminForm] = useState({ full_name: '', email: '', password: '' })
  const [addAdminLoading, setAddAdminLoading] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')
  const [addAdminResult, setAddAdminResult] = useState<{ email: string; password: string } | null>(null)

  function genPwd() {
    const c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'
    return Array.from({ length: 10 }, () => c[Math.floor(Math.random() * c.length)]).join('')
  }

  async function loadAdmins() {
    setAdminsLoading(true)
    const [{ data: profiles }, { data: sub }] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, created_at').eq('boutique_id', id).eq('role', 'boutique_admin').eq('is_active', true),
      supabase.from('subscriptions').select('id, plan, status, ends_at').eq('boutique_id', id).limit(1).single(),
    ])
    setAdmins((profiles ?? []) as AdminRow[])
    setPlan(sub?.plan ?? 'starter')
    if (sub) setSubForm({ id: sub.id, plan: sub.plan, status: sub.status, ends_at: sub.ends_at ? sub.ends_at.slice(0, 10) : '' })
    setAdminsLoading(false)
  }

  async function handleSubSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubSaving(true)
    setSubError('')
    const res = await fetch('/api/super-admin/update-subscription', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        subForm.id
          ? { id: subForm.id, plan: subForm.plan, status: subForm.status, ends_at: subForm.ends_at || undefined }
          : { boutique_id: id, plan: subForm.plan, status: subForm.status, ends_at: subForm.ends_at || undefined }
      ),
    })
    setSubSaving(false)
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setSubError(data.error || 'Erreur lors de la mise à jour de l\'abonnement')
      return
    }
    setSubSuccess(true)
    setTimeout(() => setSubSuccess(false), 3000)
    await loadAdmins()
  }

  async function deleteAdmin(userId: string, name: string) {
    if (!confirm(`Supprimer l'admin "${name}" ?`)) return
    setDeletingAdmin(userId)
    await fetch('/api/super-admin/delete-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId }),
    })
    await loadAdmins()
    setDeletingAdmin(null)
  }

  async function addAdmin() {
    setAddAdminError('')
    const maxAdmins = plan === 'pro' ? 5 : 1
    if (admins.length >= maxAdmins) {
      setAddAdminError(`Plan ${plan} : maximum ${maxAdmins} admin(s). Déjà ${admins.length}.`)
      return
    }
    if (!addAdminForm.full_name || !addAdminForm.email) { setAddAdminError('Nom et email requis.'); return }
    // Un mot de passe ne peut être fixé que pour le tout premier admin d'une
    // boutique — au-delà, le serveur impose systématiquement le mot de passe
    // partagé déjà en place, quoi qu'on lui envoie ici.
    const isFirstAdmin = admins.length === 0
    const pwd = isFirstAdmin ? (addAdminForm.password || genPwd()) : undefined
    setAddAdminLoading(true)
    const res = await fetch('/api/super-admin/add-boutique-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ boutique_id: id, full_name: addAdminForm.full_name, email: addAdminForm.email, password: pwd }),
    })
    const data = await res.json()
    if (!res.ok) { setAddAdminError(data.error || 'Erreur'); setAddAdminLoading(false); return }
    setAddAdminResult({ email: data.email ?? addAdminForm.email, password: data.password ?? pwd ?? '' })
    setAddAdminLoading(false)
    setAddAdminForm({ full_name: '', email: '', password: '' })
    await loadAdmins()
  }

  useEffect(() => {
    loadAdmins()
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    supabase.from('boutiques').select('*').eq('id', id).single().then(({ data }) => {
      if (data) {
        const d = data as unknown as Record<string, unknown>
        setForm({
          name: (d.name as string) ?? '',
          slug: (d.slug as string) ?? '',
          city: (d.city as string) ?? '',
          shop_category: (d.shop_category as string) ?? '',
          description: (d.description as string) ?? '',
          whatsapp_number: (d.whatsapp_number as string) ?? '',
          phone: (d.phone as string) ?? '',
          facebook_url: (d.facebook_url as string) ?? '',
          instagram_url: (d.instagram_url as string) ?? '',
          tiktok_url: (d.tiktok_url as string) ?? '',
          snapchat_url: (d.snapchat_url as string) ?? '',
          wave_number: (d.wave_number as string) ?? '',
          orange_money_number: (d.orange_money_number as string) ?? '',
          delivery_info: (d.delivery_info as string) ?? '',
          show_delivery_info: !!(d.show_delivery_info),
          is_verified: !!(d.is_verified),
          is_active: d.is_active !== false,
          is_founder: !!(d.is_founder),
          primary_color: (d.primary_color as string) ?? '#F97316',
          theme: (d.theme as string) ?? 'light',
          logo_url: (d.logo_url as string) ?? '',
          cover_url: (d.cover_url as string) ?? '',
        })
        setLogoPreview(data.logo_url ?? '')
        setCoverPreview(data.cover_url ?? '')
      }
      setLoading(false)
    })
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToCompressedBase64(file, 500)
    setLogoPreview(b64)
    setForm(f => ({ ...f, logo_url: b64 }))
  }

  async function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const b64 = await fileToCompressedBase64(file, 1200)
    setCoverPreview(b64)
    setForm(f => ({ ...f, cover_url: b64 }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
    const payload = plan === 'pro' ? form : { ...form, primary_color: '#F97316', theme: 'light' }
    const res = await fetch('/api/super-admin/edit-boutique', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...payload }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(result.error || 'Erreur lors de la mise à jour')
      setSaving(false)
      return
    }
    setSuccess(true)
    setSaving(false)
    setTimeout(() => router.push('/dashboard/super-admin/boutiques'), 1200)
    } catch {
      setError('Erreur réseau. Veuillez réessayer.')
      setSaving(false)
    }
  }

  if (loading) return <p className="text-gray-500 text-sm">Chargement...</p>

  return (
    <div className="max-w-5xl">
      <Link href="/dashboard/super-admin/boutiques" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-orange transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" />
        Retour aux boutiques
      </Link>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Modifier la boutique</h1>
        <p className="text-gray-500 text-sm mt-1">Informations, visuels, couleurs et thème</p>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">Boutique mise à jour avec succès.</div>}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-3">Identité</h2>
            <div>
              <label className={labelClass}>Nom de la boutique *</label>
              <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Slug (URL)</label>
              <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden focus-within:border-brand-orange transition-colors">
                <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200">{siteOrigin.replace(/^https?:\/\//, '')}/</span>
                <input type="text" value={form.slug} onChange={e => setForm(f => ({ ...f, slug: e.target.value }))}
                  className="flex-1 px-3 py-2.5 text-sm text-gray-900 focus:outline-none bg-white" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Ville</label>
                <input type="text" value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} placeholder="Dakar" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Catégorie</label>
                <select value={form.shop_category} onChange={e => setForm(f => ({ ...f, shop_category: e.target.value }))} className={inputClass}>
                  {SHOP_CATEGORY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Description</label>
              <textarea rows={2} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Présentation courte…" className={`${inputClass} resize-none`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>WhatsApp *</label>
                <input type="tel" value={form.whatsapp_number} onChange={e => setForm(f => ({ ...f, whatsapp_number: e.target.value }))} placeholder="+221 77…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+221 33…" className={inputClass} />
              </div>
            </div>
            <div className="flex items-center gap-6 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_verified} onChange={e => setForm(f => ({ ...f, is_verified: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm text-gray-600">Vérifiée</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
                <span className="text-sm text-gray-600">Active</span>
              </label>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-900">Badge fondateur</p>
                <p className="text-xs text-gray-500 mt-0.5">Affiche un badge doré sur la page de la boutique</p>
              </div>
              <label className="flex items-center cursor-pointer">
                <input type="checkbox" checked={form.is_founder} onChange={e => setForm(f => ({ ...f, is_founder: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
              </label>
            </div>
          </div>

          {/* Paiements & livraison */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">Paiements & livraison</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Numéro Wave</label>
                <input type="tel" value={form.wave_number} onChange={e => setForm(f => ({ ...f, wave_number: e.target.value }))} placeholder="+221 77…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Numéro Orange Money</label>
                <input type="tel" value={form.orange_money_number} onChange={e => setForm(f => ({ ...f, orange_money_number: e.target.value }))} placeholder="+221 77…" className={inputClass} />
              </div>
            </div>
            <div>
              <label className={labelClass}>Infos livraison</label>
              <textarea rows={2} value={form.delivery_info} onChange={e => setForm(f => ({ ...f, delivery_info: e.target.value }))}
                placeholder="Délai, zones, tarifs…" className={`${inputClass} resize-none`} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.show_delivery_info} onChange={e => setForm(f => ({ ...f, show_delivery_info: e.target.checked }))} className="w-4 h-4 accent-brand-orange" />
              <span className="text-sm text-gray-600">Afficher les infos livraison sur la vitrine</span>
            </label>
          </div>

          {/* Réseaux sociaux */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">Réseaux sociaux</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Facebook</label>
                <input type="url" value={form.facebook_url} onChange={e => setForm(f => ({ ...f, facebook_url: e.target.value }))} placeholder="https://facebook.com/…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Instagram</label>
                <input type="url" value={form.instagram_url} onChange={e => setForm(f => ({ ...f, instagram_url: e.target.value }))} placeholder="https://instagram.com/…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>TikTok</label>
                <input type="url" value={form.tiktok_url} onChange={e => setForm(f => ({ ...f, tiktok_url: e.target.value }))} placeholder="https://tiktok.com/@…" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Snapchat</label>
                <input type="url" value={form.snapchat_url} onChange={e => setForm(f => ({ ...f, snapchat_url: e.target.value }))} placeholder="https://snapchat.com/add/…" className={inputClass} />
              </div>
            </div>
          </div>

          {/* Visuals */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">Visuels</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Logo</label>
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-brand-orange/40 transition-colors group">
                  {logoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={logoPreview} alt="" className="w-16 h-16 rounded-xl object-cover" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-300 group-hover:text-brand-orange/50 transition-colors" />
                      <span className="text-xs text-gray-400">Cliquer pour uploader</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </label>
              </div>
              <div>
                <label className={labelClass}>Bannière / Couverture</label>
                <label className="flex flex-col items-center justify-center gap-2 cursor-pointer border-2 border-dashed border-gray-200 rounded-xl p-4 hover:border-brand-orange/40 transition-colors group h-full min-h-[100px]">
                  {coverPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={coverPreview} alt="" className="w-full h-20 rounded-xl object-cover" />
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-300 group-hover:text-brand-orange/50 transition-colors" />
                      <span className="text-xs text-gray-400">Bannière (16:9 recommandé)</span>
                    </>
                  )}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverChange} />
                </label>
              </div>
            </div>
          </div>

          {/* Color & theme — Pro only, Starter keeps TerangaSpot's default colors */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-semibold text-gray-900 text-sm">Couleur & thème</h2>
              {plan !== 'pro' && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                  Réservé au plan Pro
                </span>
              )}
            </div>
            {plan !== 'pro' && (
              <p className="text-xs text-gray-400 -mt-2">
                Cette boutique est en plan Starter : elle conserve les couleurs et le thème par défaut de TerangaSpot. Passez-la en Pro pour personnaliser.
              </p>
            )}
            <fieldset disabled={plan !== 'pro'} className={plan !== 'pro' ? 'opacity-40 pointer-events-none' : ''}>
              <div>
                <label className={labelClass}>Couleur principale</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_PALETTE.map(c => (
                    <button key={c} type="button" onClick={() => setForm(f => ({ ...f, primary_color: c }))}
                      className="w-8 h-8 rounded-lg border-2 transition-all"
                      style={{ backgroundColor: c, borderColor: form.primary_color === c ? '#F97316' : 'transparent', transform: form.primary_color === c ? 'scale(1.15)' : 'scale(1)' }} />
                  ))}
                  <input type="color" value={form.primary_color}
                    onChange={e => setForm(f => ({ ...f, primary_color: e.target.value }))}
                    className="w-8 h-8 rounded-lg cursor-pointer border border-gray-200" title="Couleur personnalisée" />
                </div>
              </div>
              <div>
                <label className={labelClass}>Thème</label>
                <div className="flex gap-2">
                  {THEMES.map(t => (
                    <button key={t.value} type="button"
                      onClick={() => setForm(f => ({ ...f, theme: t.value }))}
                      className="flex-1 py-2.5 rounded-xl text-sm font-medium border-2 transition-all"
                      style={{
                        borderColor: form.theme === t.value ? '#F97316' : '#E5E7EB',
                        backgroundColor: t.bg === 'var(--accent)' ? form.primary_color : t.bg,
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

        {/* Preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <p className="text-xs font-medium text-gray-500 mb-3 uppercase tracking-wider">Aperçu en direct</p>
            <BoutiquePreview
              name={form.name}
              color={plan === 'pro' ? form.primary_color : '#F97316'}
              theme={plan === 'pro' ? form.theme : 'light'}
              logoUrl={logoPreview || undefined}
              coverUrl={coverPreview || undefined}
            />
          </div>
        </div>

        <div className="lg:col-span-2">
          <button type="submit" disabled={saving}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white py-3 rounded-xl font-semibold transition-colors disabled:opacity-50">
            {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
          </button>
        </div>
      </form>

      {/* ── Abonnement section ── */}
      <div className="mt-8 max-w-5xl">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Abonnement</h2>
          {subError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4">{subError}</p>}
          {subSuccess && <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-xl px-4 py-3 mb-4">Abonnement mis à jour.</p>}
          <form onSubmit={handleSubSubmit} className="flex flex-wrap items-end gap-3">
            <div>
              <label className={labelClass}>Plan</label>
              <select value={subForm.plan} onChange={e => {
                const nextPlan = e.target.value
                setSubForm(f => ({ ...f, plan: nextPlan, status: nextPlan === 'free' && f.status === 'trial' ? 'active' : f.status }))
              }}
                className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none focus:border-brand-orange">
                <option value="free">Free</option>
                <option value="starter">Starter</option>
                <option value="pro">Pro</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Statut</label>
              <select value={subForm.status} onChange={e => setSubForm(f => ({ ...f, status: e.target.value }))}
                className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none focus:border-brand-orange">
                {/* Le plan Free n'a pas d'essai — toujours actif dès la création */}
                {subForm.plan !== 'free' && <option value="trial">Essai</option>}
                <option value="active">Actif</option>
                <option value="overdue">En retard</option>
                <option value="suspended">Suspendu</option>
                <option value="cancelled">Annulé</option>
              </select>
            </div>
            <div>
              <label className={labelClass}>Expire le</label>
              <input type="date" value={subForm.ends_at} onChange={e => setSubForm(f => ({ ...f, ends_at: e.target.value }))}
                className="text-sm bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-gray-700 focus:outline-none focus:border-brand-orange" />
            </div>
            <button type="submit" disabled={subSaving}
              className="text-sm bg-brand-orange hover:bg-brand-orange-dark text-white px-4 py-2.5 rounded-xl transition-colors disabled:opacity-50">
              {subSaving ? 'Enregistrement…' : subForm.id ? 'Mettre à jour l\'abonnement' : 'Créer l\'abonnement'}
            </button>
          </form>
          {!subForm.id && (
            <p className="text-xs text-amber-600 mt-3">
              Cette boutique n&apos;a pas encore d&apos;abonnement enregistré — la sauvegarde en créera un.
            </p>
          )}
          {subForm.plan !== 'pro' && (
            <p className="text-xs text-gray-400 mt-3">
              En plan {subForm.plan === 'free' ? 'Free' : 'Starter'}, la boutique garde automatiquement les couleurs et le thème par défaut de TerangaSpot.
            </p>
          )}
        </div>
      </div>

      {/* ── Admins section ── */}
      <div className="mt-8 max-w-5xl">
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-gray-900">Administrateurs</h2>
              <p className="text-xs text-gray-400 mt-0.5">
                Plan {plan} · {admins.length}/{plan === 'pro' ? 5 : 1} admin(s)
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={loadAdmins} className="p-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors">
                <RefreshCw className={`w-4 h-4 text-gray-500 ${adminsLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => { setAddAdminOpen(true); setAddAdminError(''); setAddAdminResult(null); setAddAdminForm({ full_name: '', email: '', password: genPwd() }) }}
                disabled={admins.length >= (plan === 'pro' ? 5 : 1)}
                className="inline-flex items-center gap-2 bg-brand-orange text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-brand-orange-dark transition-colors disabled:opacity-40">
                <Plus className="w-4 h-4" /> Ajouter
              </button>
            </div>
          </div>

          {adminsLoading ? (
            <p className="text-sm text-gray-400 py-4 text-center">Chargement…</p>
          ) : admins.length === 0 ? (
            <div className="text-center py-8">
              <UserCircle className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-400">Aucun admin pour cette boutique</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {admins.map(a => (
                <div key={a.id} className="flex items-center justify-between py-3 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-xs font-bold text-brand-orange">
                      {(a.full_name ?? a.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{a.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400">{a.email}</p>
                    </div>
                  </div>
                  <button onClick={() => deleteAdmin(a.id, a.full_name ?? a.email)}
                    disabled={deletingAdmin === a.id}
                    className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-40">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add admin modal */}
      {addAdminOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h3 className="font-bold text-gray-900">{addAdminResult ? 'Admin créé !' : 'Ajouter un admin'}</h3>
              <button onClick={() => setAddAdminOpen(false)} className="text-gray-400 hover:text-gray-600 text-xl">×</button>
            </div>
            <div className="p-6">
              {addAdminResult ? (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-1.5 text-sm">
                    <p className="font-semibold text-green-800">Compte créé avec succès</p>
                    <p className="text-green-700">Email : <span className="font-mono">{addAdminResult.email}</span></p>
                    <p className="text-green-700">Mot de passe : <span className="font-mono font-bold">{addAdminResult.password}</span></p>
                  </div>
                  <button onClick={() => { setAddAdminOpen(false); setAddAdminResult(null) }}
                    className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold text-sm">
                    Fermer
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {addAdminError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3">{addAdminError}</p>}
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Nom complet *</label>
                    <input type="text" value={addAdminForm.full_name}
                      onChange={e => setAddAdminForm(f => ({ ...f, full_name: e.target.value }))}
                      placeholder="Prénom Nom" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1.5">Email *</label>
                    <input type="email" value={addAdminForm.email}
                      onChange={e => setAddAdminForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="admin@boutique.com" className={inputClass} />
                  </div>
                  {admins.length === 0 ? (
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1.5 flex items-center justify-between">
                        <span>Mot de passe</span>
                        <button type="button" onClick={() => setAddAdminForm(f => ({ ...f, password: genPwd() }))}
                          className="text-brand-orange text-xs hover:underline">Regénérer</button>
                      </label>
                      <input type="text" value={addAdminForm.password}
                        onChange={e => setAddAdminForm(f => ({ ...f, password: e.target.value }))}
                        className={`${inputClass} font-mono`} />
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl px-3 py-2.5">
                      Le mot de passe partagé actuel de la boutique lui sera envoyé par email — aucun mot de passe à saisir ici.
                    </p>
                  )}
                  <button onClick={addAdmin} disabled={addAdminLoading}
                    className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold text-sm hover:bg-brand-orange-dark transition-colors disabled:opacity-50 mt-2">
                    {addAdminLoading ? 'Création…' : 'Créer l\'admin'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
