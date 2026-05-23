'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Modal } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { ImageUpload } from '@/components/menu/ImageUpload'
import { ImageCropUpload } from '@/components/menu/ImageCropUpload'
import {
  Save, Loader2, CheckCircle, ExternalLink, ToggleLeft, ToggleRight,
  ArrowLeft, UserPlus, Trash2, Users, Eye, EyeOff, Key,
} from 'lucide-react'
import Link from 'next/link'
import { PLAN_LABELS, type PlanType, getPlanFeatures } from '@/lib/plans'
import { useSettings } from '@/lib/hooks/useSettings'
import { getInitials } from '@/lib/utils'

const JOURS = [
  { key: 'lundi', label: 'Lun' }, { key: 'mardi', label: 'Mar' },
  { key: 'mercredi', label: 'Mer' }, { key: 'jeudi', label: 'Jeu' },
  { key: 'vendredi', label: 'Ven' }, { key: 'samedi', label: 'Sam' },
  { key: 'dimanche', label: 'Dim' },
] as const

type HoursEntry = { ouverture: string; fermeture: string; ferme: boolean }
type OpeningHours = Partial<Record<string, HoursEntry>>

interface AdminProfile {
  id: string
  email: string
  full_name: string | null
  restaurant_id: string | null
}

export default function EditRestaurantPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')

  // Restaurant fields
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [description, setDescription] = useState('')
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [phone, setPhone] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [bannerUrl, setBannerUrl] = useState<string | null>(null)
  const [primaryColor, setPrimaryColor] = useState('#F97316')
  const [bgColor, setBgColor] = useState('#0A0A0A')
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>('dark')
  const [isActive, setIsActive] = useState(true)
  const [openingHours, setOpeningHours] = useState<OpeningHours>({})
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [showDeliveryFee, setShowDeliveryFee] = useState(false)
  const [plan, setPlan] = useState<PlanType>('mensuel')
  const [subStatus, setSubStatus] = useState('active')
  const [subId, setSubId] = useState<string | null>(null)

  // Admins
  const [admins, setAdmins] = useState<AdminProfile[]>([])
  const [addAdminModal, setAddAdminModal] = useState(false)
  const [resetModal, setResetModal] = useState(false)
  const [selectedAdmin, setSelectedAdmin] = useState<AdminProfile | null>(null)

  // Add admin form
  const [newAdminName, setNewAdminName] = useState('')
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminPassword, setNewAdminPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [addingAdmin, setAddingAdmin] = useState(false)
  const [addAdminError, setAddAdminError] = useState<string | null>(null)
  const [addAdminSuccess, setAddAdminSuccess] = useState(false)

  // Reset password
  const [resetPassword, setResetPassword] = useState('')
  const [showResetPassword, setShowResetPassword] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [resetSuccess, setResetSuccess] = useState(false)
  const [resetError, setResetError] = useState<string | null>(null)

  const settings = useSettings()
  const planFeatures = getPlanFeatures(plan)
  const maxAdmins = planFeatures.maxAdmins

  const loadData = useCallback(async () => {
    const { data: r } = await supabase.from('restaurants').select('*').eq('id', id).single()
    if (!r) { router.push('/dashboard/super-admin/restaurants'); return }

    setRestaurantName(r.name)
    setName(r.name); setSlug(r.slug); setDescription(r.description || '')
    setCity(r.city || ''); setAddress(r.address || ''); setPhone(r.phone || '')
    setWhatsapp(r.whatsapp_number || ''); setLogoUrl(r.logo_url)
    setBannerUrl(r.banner_url || r.cover_url); setPrimaryColor(r.primary_color || '#F97316')
    setBgColor(r.background_color || '#0A0A0A'); setThemeMode(r.theme_mode || 'dark')
    setIsActive(r.is_active); setOpeningHours((r.opening_hours as OpeningHours) || {})
    setDeliveryFee(String(r.delivery_fee || 0)); setShowDeliveryFee(r.show_delivery_fee || false)

    // Subscription
    const { data: sub } = await supabase.from('subscriptions').select('*').eq('restaurant_id', id).single()
    if (sub) { setPlan(sub.plan as PlanType); setSubStatus(sub.status); setSubId(sub.id) }

    // Admins linked to this restaurant
    const { data: adminList } = await supabase
      .from('profiles')
      .select('id, email, full_name, restaurant_id')
      .eq('restaurant_id', id)
      .eq('role', 'restaurant_admin')
    setAdmins(adminList ?? [])

    setLoading(false)
  }, [id, router, supabase])

  useEffect(() => { loadData() }, [loadData])

  function updateHours(jour: string, field: 'ouverture' | 'fermeture' | 'ferme', value: string | boolean) {
    setOpeningHours(prev => ({
      ...prev,
      [jour]: { ouverture: '08:00', fermeture: '22:00', ferme: false, ...(prev[jour] || {}), [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const updates = {
      name, slug, description: description || null, city: city || null, address: address || null,
      phone: phone || null, whatsapp_number: whatsapp || null, logo_url: logoUrl,
      banner_url: bannerUrl, cover_url: bannerUrl,
      primary_color: primaryColor, background_color: bgColor, theme_mode: themeMode,
      is_active: isActive, opening_hours: openingHours,
      delivery_fee: parseInt(deliveryFee) || 0, show_delivery_fee: showDeliveryFee,
    }
    await supabase.from('restaurants').update(updates).eq('id', id)

    if (subId) {
      await supabase.from('subscriptions').update({ plan, status: subStatus }).eq('id', subId)
    } else {
      await supabase.from('subscriptions').insert({ restaurant_id: id, plan, status: subStatus })
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  async function handleAddAdmin() {
    if (!newAdminName || !newAdminEmail || !newAdminPassword) {
      setAddAdminError('Tous les champs sont requis.')
      return
    }
    if (newAdminPassword.length < 8) {
      setAddAdminError('Mot de passe trop court (minimum 8 caractères).')
      return
    }
    if (admins.length >= maxAdmins) {
      setAddAdminError(`Le plan ${PLAN_LABELS[plan]} est limité à ${maxAdmins} admin(s).`)
      return
    }

    setAddingAdmin(true)
    setAddAdminError(null)

    const res = await fetch('/api/admin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: newAdminName,
        email: newAdminEmail,
        password: newAdminPassword,
        restaurant_id: id,
      }),
    })

    const data = await res.json()
    setAddingAdmin(false)

    if (!res.ok) {
      setAddAdminError(data.error || 'Erreur inconnue')
      return
    }

    setAddAdminSuccess(true)
    await loadData()
    setTimeout(() => {
      setAddAdminModal(false)
      setAddAdminSuccess(false)
      setNewAdminName(''); setNewAdminEmail(''); setNewAdminPassword('')
    }, 2000)
  }

  async function handleRemoveAdmin(profileId: string) {
    if (!confirm('Retirer cet admin du restaurant ? Son compte reste actif.')) return
    await fetch('/api/admin/remove-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, action: 'unlink' }),
    })
    setAdmins(prev => prev.filter(a => a.id !== profileId))
  }

  function openReset(admin: AdminProfile) {
    setSelectedAdmin(admin)
    setResetPassword('')
    setResetSuccess(false)
    setResetError(null)
    setResetModal(true)
  }

  async function handleReset() {
    if (!selectedAdmin || resetPassword.length < 8) {
      setResetError('Minimum 8 caractères.')
      return
    }
    setResetting(true)
    setResetError(null)
    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: selectedAdmin.id, new_password: resetPassword }),
    })
    const data = await res.json()
    setResetting(false)
    if (!res.ok) { setResetError(data.error || 'Erreur'); return }
    setResetSuccess(true)
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    return pwd
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64">
      <Loader2 className="w-8 h-8 animate-spin text-brand-orange" />
    </div>
  )

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/super-admin/restaurants" className="text-gray-500 hover:text-white transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">{restaurantName}</h1>
            <p className="text-gray-500 text-sm mt-0.5">Modifier le restaurant</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <a href={`/${slug}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 bg-surface-100 hover:bg-surface-200 text-gray-300 px-3 py-2 rounded-xl text-sm font-medium transition-colors">
            <ExternalLink className="w-3.5 h-3.5" />Voir le site
          </a>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : success ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {success ? 'Sauvegardé !' : 'Enregistrer'}
          </button>
        </div>
      </div>

      <div className="space-y-5">

        {/* ── Admins section ────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-brand-orange" />
              <h2 className="text-white font-semibold text-sm">
                Administrateurs
              </h2>
              <span className="text-xs text-gray-500">
                {admins.length}/{maxAdmins} (plan {PLAN_LABELS[plan]})
              </span>
            </div>
            <button
              onClick={() => {
                setAddAdminError(null)
                setAddAdminSuccess(false)
                setNewAdminName(''); setNewAdminEmail(''); setNewAdminPassword('')
                setAddAdminModal(true)
              }}
              disabled={admins.length >= maxAdmins}
              className="flex items-center gap-1.5 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange border border-brand-orange/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Ajouter un admin
            </button>
          </div>

          {admins.length === 0 ? (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-surface-200 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Users className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-gray-500 text-sm">Aucun admin lié à ce restaurant</p>
              <p className="text-gray-600 text-xs mt-1">Ajoutez le premier administrateur ci-dessus</p>
            </div>
          ) : (
            <div className="space-y-2">
              {admins.map(admin => (
                <div key={admin.id} className="flex items-center gap-3 bg-surface-100 rounded-xl px-4 py-3">
                  <div className="w-9 h-9 bg-brand-orange/10 rounded-full flex items-center justify-center text-brand-orange text-sm font-bold flex-shrink-0">
                    {getInitials(admin.full_name || admin.email)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{admin.full_name || 'Sans nom'}</p>
                    <p className="text-gray-500 text-xs truncate">{admin.email}</p>
                  </div>
                  <Badge variant="success">Actif</Badge>
                  <button
                    onClick={() => openReset(admin)}
                    className="p-1.5 text-gray-500 hover:text-brand-orange transition-colors"
                    title="Modifier le mot de passe"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleRemoveAdmin(admin.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 transition-colors"
                    title="Retirer du restaurant"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {admins.length >= maxAdmins && (
            <p className="text-yellow-400 text-xs mt-3 text-center">
              Limite atteinte pour le plan {PLAN_LABELS[plan]}. Passez au plan supérieur pour ajouter plus d&apos;admins.
            </p>
          )}
        </div>

        {/* ── Abonnement & Statut ───────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">Abonnement & Statut</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Select label="Plan" value={plan} onChange={e => setPlan(e.target.value as PlanType)}
              options={Object.entries(PLAN_LABELS).map(([v, l]) => ({ value: v, label: l }))} />
            <Select label="Statut" value={subStatus} onChange={e => setSubStatus(e.target.value)}
              options={[
                { value: 'active', label: 'Actif' },
                { value: 'trial', label: 'Essai' },
                { value: 'suspended', label: 'Suspendu' },
                { value: 'cancelled', label: 'Annulé' },
              ]} />
          </div>
          <div className="flex items-center justify-between mt-4 p-3 bg-surface-100 rounded-xl">
            <div>
              <p className="text-white text-sm font-medium">Restaurant actif</p>
              <p className="text-gray-500 text-xs">Désactiver rend le site public inaccessible</p>
            </div>
            <button onClick={() => setIsActive(!isActive)} className="text-gray-400 hover:text-white transition-colors">
              {isActive
                ? <ToggleRight className="w-7 h-7 text-green-400" />
                : <ToggleLeft className="w-7 h-7" />
              }
            </button>
          </div>
        </div>

        {/* ── Infos de base ─────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">Informations</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom" value={name} onChange={e => setName(e.target.value)} />
            <Input label="Slug (URL)" value={slug} onChange={e => setSlug(e.target.value)} hint={`${settings.platform_url.replace("https://", "")}/${slug}`} />
            <Input label="Ville" value={city} onChange={e => setCity(e.target.value)} />
            <Input label="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} />
            <div className="sm:col-span-2">
              <Input label="Adresse" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Input label="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} hint="221771234567" />
            </div>
          </div>
        </div>

        {/* ── Images ────────────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">Images</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <ImageCropUpload
                label="Logo"
                value={logoUrl}
                onChange={setLogoUrl}
                folder="logos"
                aspect="square"
                previewShape="circle"
              />
            </div>
            <div>
              <ImageCropUpload
                label="Bannière"
                value={bannerUrl}
                onChange={setBannerUrl}
                folder="banners"
                aspect="banner"
                previewShape="rect"
              />
            </div>
          </div>
        </div>

        {/* ── Thème ─────────────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-1 text-sm">Thème du site</h2>
          <p className="text-gray-500 text-xs mb-4">Couleurs personnalisées (plan Annuel requis)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-gray-400 text-xs block mb-2">Mode</label>
              <div className="flex gap-2">
                {(['dark', 'light'] as const).map(m => (
                  <button key={m} onClick={() => setThemeMode(m)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-colors border ${themeMode === m ? 'bg-brand-orange/10 border-brand-orange/50 text-brand-orange' : 'bg-surface-100 border-surface-300 text-gray-400 hover:text-white'}`}>
                    {m === 'dark' ? '🌙 Sombre' : '☀️ Clair'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-2">Couleur principale</label>
              <div className="flex items-center gap-3">
                <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="w-12 h-10 rounded-lg border border-surface-300 cursor-pointer bg-transparent" />
                <input type="text" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)} className="flex-1 bg-surface-100 border border-surface-300 rounded-xl px-3 py-2 text-white text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-2">Couleur de fond</label>
              <div className="flex items-center gap-3">
                <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)} className="w-12 h-10 rounded-lg border border-surface-300 cursor-pointer bg-transparent" />
                <input type="text" value={bgColor} onChange={e => setBgColor(e.target.value)} className="flex-1 bg-surface-100 border border-surface-300 rounded-xl px-3 py-2 text-white text-sm font-mono" />
              </div>
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-2">Aperçu live</label>
              <div className="rounded-xl p-3 flex items-center gap-3" style={{ backgroundColor: bgColor, border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm" style={{ backgroundColor: primaryColor }}>R</div>
                <div className="flex-1">
                  <p className="text-sm font-semibold" style={{ color: themeMode === 'dark' ? '#fff' : '#111' }}>Mon Restaurant</p>
                  <p className="text-xs" style={{ color: primaryColor }}>2 500 FCFA</p>
                </div>
                <button className="w-7 h-7 rounded-full flex items-center justify-center" style={{ backgroundColor: primaryColor }}>
                  <span className="text-white text-xs font-bold">+</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Livraison ─────────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">Livraison</h2>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showDeliveryFee} onChange={e => setShowDeliveryFee(e.target.checked)} className="w-4 h-4 accent-brand-orange" />
              <span className="text-gray-300 text-sm">Afficher les frais de livraison</span>
            </label>
            {showDeliveryFee && (
              <Input label="Frais de livraison (FCFA)" type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} />
            )}
          </div>
        </div>

        {/* ── Horaires ──────────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <h2 className="text-white font-semibold mb-4 text-sm">Horaires d&apos;ouverture</h2>
          <div className="space-y-3">
            {JOURS.map(({ key, label }) => {
              const h = openingHours[key]
              const ferme = h?.ferme ?? false
              return (
                <div key={key} className="flex items-center gap-3 flex-wrap">
                  <span className="text-gray-400 text-sm w-10 flex-shrink-0">{label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!ferme} onChange={e => updateHours(key, 'ferme', !e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                    <span className="text-xs text-gray-500">Ouvert</span>
                  </label>
                  {!ferme ? (
                    <>
                      <input type="time" value={h?.ouverture || '08:00'} onChange={e => updateHours(key, 'ouverture', e.target.value)} className="bg-surface-100 border border-surface-300 rounded-lg px-3 py-1.5 text-white text-sm w-28" />
                      <span className="text-gray-600 text-xs">→</span>
                      <input type="time" value={h?.fermeture || '22:00'} onChange={e => updateHours(key, 'fermeture', e.target.value)} className="bg-surface-100 border border-surface-300 rounded-lg px-3 py-1.5 text-white text-sm w-28" />
                    </>
                  ) : <span className="text-xs text-red-400">Fermé</span>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── Add Admin Modal ──────────────────────────────────────────────── */}
      <Modal open={addAdminModal} onClose={() => setAddAdminModal(false)} title="Ajouter un administrateur" size="sm">
        {addAdminSuccess ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-white font-semibold">Admin ajouté avec succès !</p>
            <p className="text-gray-500 text-sm">Le compte est créé et lié à ce restaurant.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface-100 rounded-xl p-3 text-xs text-gray-400">
              Cet admin aura accès uniquement au dashboard de <span className="text-white font-semibold">{restaurantName}</span>.
            </div>
            {addAdminError && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{addAdminError}</div>
            )}
            <Input label="Nom complet" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} placeholder="Aminata Diallo" />
            <Input label="Email" type="email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} placeholder="admin@restaurant.com" />
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Mot de passe</label>
              <div className="relative">
                <input
                  type={showNewPassword ? 'text' : 'password'}
                  value={newAdminPassword}
                  onChange={e => setNewAdminPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-surface-100 border border-surface-300 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 pr-10"
                />
                <button onClick={() => setShowNewPassword(!showNewPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={() => { const p = generatePassword(); setNewAdminPassword(p); setShowNewPassword(true) }}
              className="text-xs text-brand-orange hover:underline"
            >
              Générer un mot de passe aléatoire
            </button>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setAddAdminModal(false)} className="flex-1 bg-surface-100 hover:bg-surface-200 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
                Annuler
              </button>
              <button onClick={handleAddAdmin} disabled={addingAdmin} className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {addingAdmin ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Ajouter'}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* ── Reset Password Modal ─────────────────────────────────────────── */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Modifier le mot de passe" size="sm">
        {resetSuccess ? (
          <div className="flex flex-col items-center text-center py-4 gap-3">
            <CheckCircle className="w-12 h-12 text-green-400" />
            <p className="text-white font-semibold">Mot de passe mis à jour !</p>
            <div className="w-full bg-surface-100 rounded-xl px-4 py-3 font-mono text-brand-orange text-sm break-all text-center">{resetPassword}</div>
            <p className="text-gray-500 text-xs">Transmettez ce mot de passe à l&apos;administrateur.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-surface-100 rounded-xl px-4 py-3">
              <p className="text-gray-400 text-xs">Admin</p>
              <p className="text-white text-sm font-medium">{selectedAdmin?.full_name || selectedAdmin?.email}</p>
            </div>
            {resetError && <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">{resetError}</div>}
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input type={showResetPassword ? 'text' : 'password'} value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Minimum 8 caractères"
                  className="w-full bg-surface-100 border border-surface-300 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 pr-10" />
                <button onClick={() => setShowResetPassword(!showResetPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white">
                  {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button onClick={() => { const p = generatePassword(); setResetPassword(p); setShowResetPassword(true) }} className="text-xs text-brand-orange hover:underline">
              Générer un mot de passe aléatoire
            </button>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setResetModal(false)} className="flex-1 bg-surface-100 hover:bg-surface-200 text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">Annuler</button>
              <button onClick={handleReset} disabled={resetting} className="flex-1 bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
                {resetting ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Mettre à jour'}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  )
}
