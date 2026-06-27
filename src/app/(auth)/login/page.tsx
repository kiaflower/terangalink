'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Zap, Mail, Lock } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleLogin() {
    if (!email || !password) {
      setError('Veuillez remplir tous les champs.')
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError || !data.user) {
      setError('Email ou mot de passe incorrect.')
      setLoading(false)
      return
    }

    // Fetch role to redirect correctly
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (profile?.role === 'super_admin') {
      router.push('/dashboard/super-admin')
    } else {
      router.push('/dashboard/restaurant')
    }
  }

  return (
    <div className="animate-fade-in">
      {/* Logo */}
      <div className="flex items-center gap-2.5 justify-center mb-8">
        <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-10 h-10 rounded-xl object-cover" />
        <span className="font-bold text-2xl">
          <span style={{ color: '#F97316' }}>Teranga</span>
          <span style={{ color: '#111111' }}>Link</span>
        </span>
      </div>

      {/* Card */}
      <div className="form-card">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Connexion</h1>
          <p className="text-gray-500 text-sm mt-1">
            Accédez à votre tableau de bord
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3 mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <Input
            label="Email"
            type="email"
            placeholder="votre@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-4 h-4" />}
            autoComplete="email"
          />

          <Input
            label="Mot de passe"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            icon={<Lock className="w-4 h-4" />}
            autoComplete="current-password"
          />
        </div>

        <Button
          fullWidth
          size="lg"
          loading={loading}
          onClick={handleLogin}
          className="mt-6"
        >
          Se connecter
        </Button>

        <div className="mt-4 text-center">
          <Link href="/" className="text-gray-600 hover:text-brand-orange text-sm transition-colors">
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  )
}
