'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { CUISINE_OPTIONS } from '@/lib/cuisines'
import { Button } from '@/components/ui/Button'
import {
  User,
  Mail,
  Lock,
  Store,
  MapPin,
  Phone,
  UtensilsCrossed,
  CheckCircle2,
} from 'lucide-react'

const PLAN_OPTIONS = [
  { value: 'starter', label: 'Starter — 9 000 FCFA/mois' },
  { value: 'pro', label: 'Pro — 15 000 FCFA/mois' },
]

export default function CreateAdminPage() {
  const router = useRouter()

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    restaurant_name: '',
    restaurant_city: 'Dakar',
    restaurant_phone: '',
    restaurant_address: '',
    cuisine_type: '',
    plan: 'starter',
  })

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [key]: e.target.value }))
  }

  async function handleSubmit() {
    if (!form.full_name || !form.email || !form.password || !form.restaurant_name) {
      setError('Veuillez remplir tous les champs obligatoires.')
      return
    }

    if (form.password.length < 8) {
      setError('Le mot de passe doit contenir au moins 8 caractères.')
      return
    }

    setLoading(true)
    setError(null)

    const response = await fetch('/api/users/create-restaurant-admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })

    const result = await response.json()

    if (!response.ok || !result.success) {
      setError(result.error || 'Une erreur est survenue.')
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => router.push('/dashboard/super-admin/restaurants'), 2000)
  }

  if (success) {
    return (
      <div className="p-6 sm:p-8 max-w-2xl">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-gray-900 text-xl font-bold mb-2">Compte créé avec succès !</h2>
          <p className="text-gray-500 text-sm">
            Le restaurant et son administrateur ont été créés. Redirection en cours…
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Créer un admin restaurant</h1>
        <p className="text-gray-500 text-sm mt-1">
          Crée un compte admin, un restaurant, et les lie automatiquement.
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-6">
          {error}
        </div>
      )}

      <div className="space-y-6">
        {/* Admin info */}
        <div className="form-card">
          <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <User className="w-4 h-4 text-brand-orange" />
            Informations de l&apos;administrateur
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Nom complet *"
              placeholder="Aminata Diallo"
              value={form.full_name}
              onChange={set('full_name')}
              icon={<User className="w-4 h-4" />}
            />
            <Input
              label="Email *"
              type="email"
              placeholder="admin@restaurant.com"
              value={form.email}
              onChange={set('email')}
              icon={<Mail className="w-4 h-4" />}
            />
            <div className="sm:col-span-2">
              <Input
                label="Mot de passe *"
                type="password"
                placeholder="Minimum 8 caractères"
                value={form.password}
                onChange={set('password')}
                icon={<Lock className="w-4 h-4" />}
                hint="Partagez ce mot de passe avec l'administrateur"
              />
            </div>
          </div>
        </div>

        {/* Restaurant info */}
        <div className="form-card">
          <h2 className="text-gray-900 font-semibold mb-4 flex items-center gap-2">
            <Store className="w-4 h-4 text-brand-orange" />
            Informations du restaurant
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Input
                label="Nom du restaurant *"
                placeholder="Chez Ama"
                value={form.restaurant_name}
                onChange={set('restaurant_name')}
                icon={<Store className="w-4 h-4" />}
              />
            </div>
            <Input
              label="Ville"
              placeholder="Dakar"
              value={form.restaurant_city}
              onChange={set('restaurant_city')}
              icon={<MapPin className="w-4 h-4" />}
            />
            <Input
              label="Téléphone"
              placeholder="+221 77 000 00 00"
              value={form.restaurant_phone}
              onChange={set('restaurant_phone')}
              icon={<Phone className="w-4 h-4" />}
            />
            <div className="sm:col-span-2">
              <Input
                label="Adresse"
                placeholder="Rue de l'Almadies, Dakar"
                value={form.restaurant_address}
                onChange={set('restaurant_address')}
                icon={<MapPin className="w-4 h-4" />}
              />
            </div>
            <Select
              label="Type de cuisine"
              options={CUISINE_OPTIONS}
              value={form.cuisine_type}
              onChange={set('cuisine_type')}
            />
            <Select
              label="Plan d'abonnement"
              options={PLAN_OPTIONS}
              value={form.plan}
              onChange={set('plan')}
            />
          </div>
        </div>

        <Button
          onClick={handleSubmit}
          loading={loading}
          size="lg"
          className="w-full sm:w-auto"
        >
          Créer le compte et le restaurant
        </Button>
      </div>
    </div>
  )
}
