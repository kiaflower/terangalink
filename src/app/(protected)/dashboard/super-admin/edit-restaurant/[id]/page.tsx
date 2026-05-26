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
  const settings = useSettings()
  const baseUrl = typeof window !== 'undefined'
    ? window.location.origin
    : settings.platform_url

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [restaurantName, setRestaurantName] = useState('')
  const [previewPrimary, setPreviewPrimary] = useState('#F97316')
  const [previewBg, setPreviewBg] = useState('#0A0A0A')
  const [previewMode, setPreviewMode] = useState<'dark' | 'light'>('dark')

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

  const maxAdmins = getPlanFeatures(plan).maxAdmins

  const loadData = useCallback(async () => {
    setLoading(true)

    const { data: r } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single()

    if (!r) { router.push('/dashboard/super-admin/restaurants'); return }

    setRestaurantName(r.name)
    setName(r.name)
    setSlug(r.slug || '')
    setDescription(r.description || '')
    setCity(r.city || '')
    setAddress(r.address || '')
    setPhone(r.phone || '')
    setWhatsapp(r.whatsapp_number || '')
    setLogoUrl(r.logo_url)
    setBannerUrl(r.banner_url || r.cover_url)
    setPrimaryColor(r.primary_color || '#F97316')
    setBgColor(r.background_color || '#0A0A0A')
    setThemeMode(r.theme_mode || 'dark')
    setPreviewPrimary(r.primary_color || '#F97316')
    setPreviewBg(r.background_color || '#0A0A0A')
    setPreviewMode(r.theme_mode || 'dark')
    setIsActive(r.is_active ?? true)
    setOpeningHours((r.opening_hours as OpeningHours) || {})
    setDeliveryFee(String(r.delivery_fee ?? 0))
    setShowDeliveryFee(!!r.show_delivery_fee)

    const { data: sub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('restaurant_id', id)
      .single()

    if (sub) {
      setSubId(sub.id)
      setPlan((sub.plan as PlanType) || 'mensuel')
      setSubStatus(sub.status || 'active')
    }

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id,email,full_name,restaurant_id')
      .eq('restaurant_id', id)
      .eq('role', 'restaurant_admin')

    setAdmins((profiles as AdminProfile[]) || [])
    setLoading(false)
  }, [id, router, supabase])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    setPreviewPrimary(primaryColor || '#F97316')
    setPreviewBg(bgColor || '#0A0A0A')
    setPreviewMode(themeMode || 'dark')
  }, [primaryColor, bgColor, themeMode])

  async function handleSave() {
    setSaving(true)
    setSuccess(false)

    await fetch('/api/admin/edit-restaurant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        name,
        slug,
        description,
        city,
        address,
        phone: phone || null,
        whatsapp_number: whatsapp || null,
        logo_url: logoUrl,
        banner_url: bannerUrl,
        primary_color: primaryColor,
        background_color: bgColor,
        theme_mode: themeMode,
        is_active: isActive,
        opening_hours: openingHours,
        delivery_fee: Number(deliveryFee) || 0,
        show_delivery_fee: showDeliveryFee,
      }),
    })

    if (subId) {
      await supabase
        .from('subscriptions')
        .update({ plan, status: subStatus })
        .eq('id', subId)
    }

    setSaving(false)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 1800)
  }

  async function handleDeleteAdmin(adminId: string) {
    if (!confirm('Supprimer cet administrateur ?')) return
    await supabase.from('profiles').delete().eq('id', adminId)
    setAdmins(prev => prev.filter(a => a.id !== adminId))
  }

  async function handleAddAdmin() {
    setAddingAdmin(true)
    setAddAdminError(null)
    setAddAdminSuccess(false)

    const res = await fetch('/api/admin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: newAdminEmail,
        password: newAdminPassword,
        full_name: newAdminName,
        restaurant_id: id,
      }),
    })

    const data = await res.json()
    setAddingAdmin(false)

    if (!res.ok) {
      setAddAdminError(data.error || 'Erreur')
      return
    }

    setAddAdminSuccess(true)
    setNewAdminName('')
    setNewAdminEmail('')
    setNewAdminPassword('')
    await loadData()
  }

  function openResetModal(admin: AdminProfile) {
    setSelectedAdmin(admin)
    setResetPassword(generatePassword())
    setResetSuccess(false)
    setResetError(null)
    setResetModal(true)
  }

  async function handleResetPassword() {
    if (!selectedAdmin) return
    setResetting(true)
    setResetError(null)

    const res = await fetch('/api/admin/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: selectedAdmin.id,
        new_password: resetPassword,
      }),
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
          <a href={`${baseUrl.replace(/\/$/, '')}/${slug}`} target="_blank" rel="noopener noreferrer"
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
                setAddAdminModal(true)
                setAddAdminError(null)
                setAddAdminSuccess(false)
                setNewAdminPassword(generatePassword())
              }}
              disabled={admins.length >= maxAdmins}
              className="flex items-center gap-1.5 text-xs bg-brand-orange hover:bg-brand-orange-dark text-white px-3 py-1.5 rounded-lg disabled:opacity-50"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Ajouter
            </button>
          </div>

          <div className="space-y-2">
            {admins.map(a => (
              <div key={a.id} className="bg-surface-100 border border-surface-200 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-brand-orange/10 text-brand-orange flex items-center justify-center text-sm font-bold">
                    {getInitials(a.full_name || a.email || '?')}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{a.full_name || 'Sans nom'}</p>
                    <p className="text-gray-500 text-xs">{a.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => openResetModal(a)} className="p-2 text-gray-500 hover:text-brand-orange transition-colors" title="Réinitialiser mot de passe">
                    <Key className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDeleteAdmin(a.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors" title="Supprimer">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
            {admins.length === 0 && (
              <p className="text-gray-500 text-xs text-center py-3">Aucun administrateur</p>
            )}
          </div>
        </div>

        {/* ── Restaurant core section ───────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Informations du restaurant</h2>

          <Input label="Nom" value={name} onChange={e => setName(e.target.value)} />
          <Input label="Slug" value={slug} onChange={e => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))} hint="Ex: chez-teranga" />
          <Input label="Description" value={description} onChange={e => setDescription(e.target.value)} />
          <Input label="Ville" value={city} onChange={e => setCity(e.target.value)} />
          <Input label="Adresse" value={address} onChange={e => setAddress(e.target.value)} />
          <Input label="Téléphone" value={phone} onChange={e => setPhone(e.target.value)} hint="221771234567" />
          <Input label="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} hint="221771234567" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ImageCropUpload
              label="Logo (1:1)"
              value={logoUrl}
              onChange={setLogoUrl}
              bucket="restaurant-assets"
              folder={`restaurants/${id}/logo`}
              aspect="square"
            />
            <ImageCropUpload
              label="Bannière (16:9)"
              value={bannerUrl}
              onChange={setBannerUrl}
              bucket="restaurant-assets"
              folder={`restaurants/${id}/banner`}
              aspect="banner"
            />
          </div>

          <div className="flex items-center justify-between bg-surface-100 rounded-xl px-3 py-2">
            <div>
              <p className="text-white text-sm font-medium">Restaurant actif</p>
              <p className="text-gray-500 text-xs">Désactiver rend le site public inaccessible</p>
            </div>
            <button onClick={() => setIsActive(v => !v)} className="text-brand-orange">
              {isActive ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
            </button>
          </div>
        </div>

        {/* ── Subscription section ─────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Abonnement</h2>

          <Select
            label="Plan"
            value={plan}
            onChange={e => setPlan(e.target.value as PlanType)}
            options={[
              { value: 'mensuel', label: 'Mensuel' },
              { value: 'trimestriel', label: 'Trimestriel' },
              { value: 'annuel', label: 'Annuel' },
            ]}
          />

          <Select
            label="Statut"
            value={subStatus}
            onChange={e => setSubStatus(e.target.value)}
            options={[
              { value: 'active', label: 'Actif' },
              { value: 'past_due', label: 'En retard' },
              { value: 'canceled', label: 'Annulé' },
            ]}
          />

          <div className="flex flex-wrap gap-2">
            {Object.entries(getPlanFeatures(plan)).map(([k, v]) => (
              <Badge key={k} variant={v ? 'success' : 'default'}>{k}</Badge>
            ))}
          </div>
        </div>

        {/* ── Theme section ────────────────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold mb-1 text-sm">Thème du site</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Couleur primaire</label>
              <input type="color" value={primaryColor} onChange={e => setPrimaryColor(e.target.value)}
                className="w-full h-11 bg-surface-100 border border-surface-300 rounded-xl p-1 cursor-pointer" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Fond</label>
              <input type="color" value={bgColor} onChange={e => setBgColor(e.target.value)}
                className="w-full h-11 bg-surface-100 border border-surface-300 rounded-xl p-1 cursor-pointer" />
            </div>
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Mode</label>
              <Select
                value={themeMode}
                onChange={e => setThemeMode(e.target.value as 'dark' | 'light')}
                options={[
                  { value: 'dark', label: 'Sombre' },
                  { value: 'light', label: 'Clair' },
                ]}
              />
            </div>
          </div>

          <div
            className="rounded-2xl border p-4 transition-all"
            style={{
              backgroundColor: previewBg,
              borderColor: previewMode === 'dark' ? '#2A2A2A' : '#D1D5DB',
            }}
          >
            <p className="text-xs mb-3" style={{ color: previewMode === 'dark' ? '#9CA3AF' : '#4B5563' }}>
              Aperçu live (identique au rendu public)
            </p>
            <div className="rounded-xl p-4" style={{ backgroundColor: previewMode === 'dark' ? '#111111' : '#FFFFFF' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold" style={{ color: previewMode === 'dark' ? '#FFFFFF' : '#111827' }}>{name || 'Nom du restaurant'}</p>
                  <p className="text-xs" style={{ color: previewMode === 'dark' ? '#9CA3AF' : '#6B7280' }}>/{slug || 'restaurant-slug'}</p>
                </div>
                <button className="px-3 py-1.5 rounded-lg text-xs font-semibold" style={{ backgroundColor: previewPrimary, color: '#FFFFFF' }}>Commander</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Delivery / hours section ─────────────────────────────────── */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5 space-y-4">
          <h2 className="text-white font-semibold text-sm">Livraison & horaires</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Frais de livraison (FCFA)"
              value={deliveryFee}
              onChange={e => setDeliveryFee(e.target.value)}
              type="number"
            />
            <div className="flex items-center justify-between bg-surface-100 rounded-xl px-3 py-2 mt-6 sm:mt-0">
              <div>
                <p className="text-white text-sm font-medium">Afficher frais de livraison</p>
                <p className="text-gray-500 text-xs">Visible sur le site public</p>
              </div>
              <button onClick={() => setShowDeliveryFee(v => !v)} className="text-brand-orange">
                {showDeliveryFee ? <ToggleRight className="w-7 h-7" /> : <ToggleLeft className="w-7 h-7" />}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {JOURS.map(j => {
              const v = openingHours[j.key] || { ouverture: '08:00', fermeture: '22:00', ferme: false }
              return (
                <div key={j.key} className="grid grid-cols-12 gap-2 items-center bg-surface-100 rounded-xl p-2.5">
                  <div className="col-span-3 sm:col-span-2 text-gray-300 text-xs font-semibold">{j.label}</div>
                  <div className="col-span-3 sm:col-span-3">
                    <Input
                      value={v.ouverture}
                      onChange={e => setOpeningHours(prev => ({ ...prev, [j.key]: { ...v, ouverture: e.target.value } }))}
                      type="time"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-3">
                    <Input
                      value={v.fermeture}
                      onChange={e => setOpeningHours(prev => ({ ...prev, [j.key]: { ...v, fermeture: e.target.value } }))}
                      type="time"
                    />
                  </div>
                  <div className="col-span-3 sm:col-span-4 flex justify-end">
                    <button
                      onClick={() => setOpeningHours(prev => ({ ...prev, [j.key]: { ...v, ferme: !v.ferme } }))}
                      className={`text-xs px-2.5 py-1 rounded-lg border ${v.ferme ? 'border-red-500/40 text-red-400' : 'border-green-500/40 text-green-400'}`}
                    >
                      {v.ferme ? 'Fermé' : 'Ouvert'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Add admin modal */}
      <Modal open={addAdminModal} onClose={() => setAddAdminModal(false)} title="Ajouter un administrateur">
        <div className="space-y-3">
          <Input label="Nom complet" value={newAdminName} onChange={e => setNewAdminName(e.target.value)} />
          <Input label="Email" value={newAdminEmail} onChange={e => setNewAdminEmail(e.target.value)} type="email" />
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Mot de passe</label>
            <div className="relative">
              <Input
                value={newAdminPassword}
                onChange={e => setNewAdminPassword(e.target.value)}
                type={showNewPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {addAdminError && <p className="text-red-400 text-xs">{addAdminError}</p>}
          {addAdminSuccess && <p className="text-green-400 text-xs">Administrateur ajouté avec succès.</p>}

          <button
            onClick={handleAddAdmin}
            disabled={addingAdmin || !newAdminEmail || !newAdminPassword}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {addingAdmin ? 'Ajout...' : 'Ajouter'}
          </button>
        </div>
      </Modal>

      {/* Reset password modal */}
      <Modal open={resetModal} onClose={() => setResetModal(false)} title="Réinitialiser mot de passe">
        <div className="space-y-3">
          <p className="text-gray-400 text-sm">
            {selectedAdmin ? `Nouveau mot de passe pour ${selectedAdmin.email}` : ''}
          </p>
          <div>
            <label className="text-gray-400 text-xs block mb-1.5">Nouveau mot de passe</label>
            <div className="relative">
              <Input
                value={resetPassword}
                onChange={e => setResetPassword(e.target.value)}
                type={showResetPassword ? 'text' : 'password'}
              />
              <button
                type="button"
                onClick={() => setShowResetPassword(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
              >
                {showResetPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setResetPassword(generatePassword())}
            className="text-xs text-brand-orange hover:text-brand-orange-dark"
          >
            Générer un autre mot de passe
          </button>

          {resetError && <p className="text-red-400 text-xs">{resetError}</p>}
          {resetSuccess && <p className="text-green-400 text-xs">Mot de passe mis à jour.</p>}

          <button
            onClick={handleResetPassword}
            disabled={resetting || !resetPassword}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold disabled:opacity-50"
          >
            {resetting ? 'En cours...' : 'Confirmer'}
          </button>
        </div>
      </Modal>
    </div>
  )
}