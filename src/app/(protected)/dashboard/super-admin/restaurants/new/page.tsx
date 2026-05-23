'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ArrowLeft, Store, User, CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { slugify } from '@/lib/utils'
import { useSettings } from '@/lib/hooks/useSettings'
import { PLAN_LABELS } from '@/lib/plans'

const CUISINE_OPTIONS = [
  { value: '', label: 'Choisir un type...' },
  { value: 'sénégalais', label: 'Cuisine sénégalaise' },
  { value: 'africain', label: 'Cuisine africaine' },
  { value: 'fast-food', label: 'Fast food' },
  { value: 'pizza', label: 'Pizza' },
  { value: 'burgers', label: 'Burgers' },
  { value: 'asiatique', label: 'Asiatique' },
  { value: 'libanais', label: 'Libanais' },
  { value: 'boulangerie', label: 'Boulangerie / Café' },
  { value: 'autre', label: 'Autre' },
]

const PLAN_OPTIONS = Object.entries(PLAN_LABELS).map(([v, l]) => ({ value: v, label: l }))

export default function NewRestaurantPage() {
  const router = useRouter()
  const settings = useSettings()

  // Restaurant fields
  const [restName, setRestName] = useState('')
  const [restSlug, setRestSlug] = useState('')
  const [restCity, setRestCity] = useState('Dakar')
  const [restPhone, setRestPhone] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [plan, setPlan] = useState('mensuel')

  // Admin fields
  const [adminName, setAdminName] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  function handleRestNameChange(val: string) {
    setRestName(val)
    setRestSlug(slugify(val))
  }

  function generatePassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#'
    let pwd = ''
    for (let i = 0; i < 12; i++) pwd += chars[Math.floor(Math.random() * chars.length)]
    setAdminPassword(pwd)
    setShowPassword(true)
  }

  async function handleSubmit() {
    if (!restName || !adminName || !adminEmail || !adminPassword) {
      setError('Tous les champs obligatoires (*) doivent être remplis.')
      return
    }
    if (adminPassword.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/create-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        full_name: adminName,
        email: adminEmail,
        password: adminPassword,
        create_restaurant: true,
        restaurant_name: restName,
        plan,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(data.error || 'Une erreur est survenue.')
      return
    }

    // Update restaurant with extra info
    if (data.data?.restaurant_id) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      await fetch(`${supabaseUrl}/rest/v1/restaurants?id=eq.${data.data.restaurant_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey!,
          'Authorization': `Bearer ${anonKey}`,
        },
        body: JSON.stringify({
          city: restCity || 'Dakar',
          phone: restPhone || null,
          cuisine_type: cuisineType || null,
          slug: restSlug || slugify(restName),
        }),
      })
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard/super-admin/restaurants'), 2500)
  }

  if (success) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-white text-xl font-bold mb-2">Restaurant créé avec succès !</h2>
          <p className="text-gray-500 text-sm">Le restaurant et son administrateur sont prêts. Redirection...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/super-admin/restaurants" className="text-gray-500 hover:text-white transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nouveau restaurant</h1>
          <p className="text-gray-500 text-sm mt-0.5">Crée le restaurant et son admin en une seule étape</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-5">
        {/* Restaurant info */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Store className="w-4 h-4 text-brand-orange" />
            <h2 className="text-white font-semibold text-sm">Informations du restaurant</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nom du restaurant *"
                placeholder="Chez Ama"
                value={restName}
                onChange={e => handleRestNameChange(e.target.value)}
              />
            </div>
            <Input
              label="Slug (URL)"
              placeholder="chez-ama"
              value={restSlug}
              onChange={e => setRestSlug(e.target.value)}
              hint={`${settings.platform_url.replace("https://", "")}/${restSlug}`}
            />
            <Input
              label="Ville"
              placeholder="Dakar"
              value={restCity}
              onChange={e => setRestCity(e.target.value)}
            />
            <Input
              label="Téléphone"
              placeholder="+221 77 000 00 00"
              value={restPhone}
              onChange={e => setRestPhone(e.target.value)}
            />
            <Select
              label="Type de cuisine"
              options={CUISINE_OPTIONS}
              value={cuisineType}
              onChange={e => setCuisineType(e.target.value)}
            />
            <div className="sm:col-span-2">
              <Select
                label="Plan d'abonnement"
                options={PLAN_OPTIONS}
                value={plan}
                onChange={e => setPlan(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Admin info */}
        <div className="bg-surface-50 border border-surface-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-brand-orange" />
            <h2 className="text-white font-semibold text-sm">Compte administrateur</h2>
          </div>
          <div className="space-y-4">
            <Input
              label="Nom complet *"
              placeholder="Aminata Diallo"
              value={adminName}
              onChange={e => setAdminName(e.target.value)}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="admin@restaurant.com"
              value={adminEmail}
              onChange={e => setAdminEmail(e.target.value)}
            />
            <div>
              <label className="text-gray-400 text-xs block mb-1.5">Mot de passe *</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={e => setAdminPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-surface-100 border border-surface-300 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={generatePassword}
              className="text-xs text-brand-orange hover:underline"
            >
              Générer un mot de passe aléatoire
            </button>
            {adminPassword && (
              <div className="bg-surface-100 rounded-xl px-4 py-3">
                <p className="text-gray-500 text-xs mb-1">Mot de passe à transmettre à l&apos;admin :</p>
                <p className="text-white font-mono text-sm break-all">{adminPassword}</p>
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white py-3.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" />Création en cours...</>
          ) : (
            <><Store className="w-4 h-4" />Créer le restaurant et l&apos;admin</>
          )}
        </button>
      </div>
    </div>
  )
}
