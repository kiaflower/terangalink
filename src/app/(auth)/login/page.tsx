'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const REASON_MESSAGES: Record<string, string> = {
  session_expired: 'Le mot de passe a été modifié depuis votre dernière connexion. Reconnectez-vous avec le nouveau mot de passe.',
  account_disabled: 'Vous avez été déconnecté.',
}

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [banner, setBanner] = useState('')
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const reason = new URLSearchParams(window.location.search).get('reason')
    if (reason && REASON_MESSAGES[reason]) setBanner(REASON_MESSAGES[reason])
  }, [])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }
    // Get profile to determine redirect
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      setError('Connexion impossible. Réessayez.')
      setLoading(false)
      return
    }

    // Estampille la session sur la version courante du mot de passe partagé —
    // et refuse ce login si le compte a été désactivé (admin secondaire
    // supprimé), sans jamais révéler la vraie raison au demandeur.
    const syncRes = await fetch('/api/auth/session-sync', { method: 'POST' })
    if (!syncRes.ok) {
      await supabase.auth.signOut()
      setError('Email ou mot de passe incorrect')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle() as { data: { role: string } | null, error: unknown }

    if (!profile) {
      setError('Aucun profil associé à ce compte. Contactez le support.')
      setLoading(false)
      return
    }

    if (profile.role === 'super_admin') {
      router.push('/dashboard/super-admin')
    } else {
      router.push('/dashboard/boutique')
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Colonne gauche — desktop uniquement */}
      <div className="hidden lg:flex lg:w-2/5 bg-gradient-to-br from-orange-900 to-orange-950 flex-col justify-between p-10">
        <div>
          <Logo textClassName="text-white font-bold text-xl" />
        </div>
        <div className="space-y-6">
          <h2 className="text-3xl font-bold text-white leading-tight">
            La plateforme des<br />commerçants du Sénégal.
          </h2>
          <p className="text-orange-300 text-sm leading-relaxed">
            Gérez votre boutique, recevez des commandes via WhatsApp et développez votre visibilité au Sénégal.
          </p>
          <div className="space-y-3">
            {[
              'Vitrine personnalisée sans appli',
              'Commandes WhatsApp en un clic',
              'Annuaire visible par tout le Sénégal',
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="text-orange-200 text-sm">{item}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="text-orange-500 text-xs">&copy; 2026 TerangaSpot</p>
      </div>

      {/* Colonne droite — formulaire */}
      <div className="flex-1 flex items-center justify-center bg-[#080808] p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8">
            <h1 className="text-2xl font-semibold text-white tracking-tight">Connexion</h1>
            <p className="text-sm text-zinc-400 mt-1">Accédez à votre espace vendeur</p>
          </div>
          {banner && (
            <p className="text-amber-300 text-sm bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg mb-4">{banner}</p>
          )}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
                placeholder="votre@email.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-zinc-300">Mot de passe</label>
                <Link href="/mot-de-passe-oublie" className="text-xs text-orange-400 hover:text-orange-300 transition-colors">
                  Mot de passe oublié ?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
                placeholder="••••••••"
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>
          <p className="text-center text-sm text-zinc-500 mt-6">
            Pas encore de boutique ?{' '}
            <Link href="/inscription" className="text-orange-400 hover:text-orange-300 transition-colors">
              S&apos;inscrire
            </Link>
          </p>
          <div className="text-center mt-4">
            <Link href="/" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">
              ← Retour à l&apos;accueil
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
