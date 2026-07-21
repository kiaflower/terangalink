'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [slug, setSlug] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [siteHost, setSiteHost] = useState('teranga-spot.com')

  useEffect(() => { setSiteHost(window.location.host) }, [])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !slug.trim()) return
    setLoading(true)
    await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim(), slug: slug.trim() }),
    })
    setLoading(false)
    setSent(true)
  }

  const inputCls = 'w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors'

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Mot de passe oublié</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Réservé à l&apos;admin principal. Indiquez votre email admin et le lien de votre boutique — si ces informations correspondent à un compte, un email sera envoyé sous peu.
          </p>
        </div>

        {sent ? (
          <div className="text-sm text-zinc-300 bg-white/5 border border-[#2E2E2E] rounded-lg px-4 py-4 space-y-3">
            <p>Si ces informations correspondent à un compte, un email a été envoyé sous peu.</p>
            <Link href="/login" className="text-orange-400 hover:text-orange-300 transition-colors text-sm">← Retour à la connexion</Link>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Votre email admin</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="vous@exemple.com" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Lien de votre boutique</label>
              <input
                type="text"
                value={slug}
                onChange={e => setSlug(e.target.value)}
                required
                placeholder={`Ex : ma-boutique ou ${siteHost}/ma-boutique`}
                className={inputCls}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Envoi…' : 'Envoyer la demande'}
            </button>
            <div className="text-center">
              <Link href="/login" className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">← Retour à la connexion</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
