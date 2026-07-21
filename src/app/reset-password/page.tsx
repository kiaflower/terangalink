'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
    supabase.auth.getSession().then(({ data }) => { if (data.session) setReady(true) })
    return () => sub.subscription.unsubscribe()
  }, [supabase])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (password !== confirm) { setMsg({ ok: false, text: 'Les mots de passe ne correspondent pas.' }); return }
    if (password.length < 8) { setMsg({ ok: false, text: 'Minimum 8 caractères.' }); return }
    setSaving(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) { setMsg({ ok: false, text: error.message }); setSaving(false); return }
    setMsg({ ok: true, text: 'Mot de passe mis à jour ! Redirection…' })
    setTimeout(() => router.push('/login'), 1500)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#080808] p-8">
      <div className="w-full max-w-sm">
        <div className="mb-8">
          <h1 className="text-2xl font-semibold text-white tracking-tight">Nouveau mot de passe</h1>
          <p className="text-sm text-zinc-400 mt-1">Choisissez un nouveau mot de passe pour votre compte.</p>
        </div>

        {!ready ? (
          <p className="text-sm text-zinc-500">Vérification du lien de réinitialisation…</p>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Nouveau mot de passe</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8 caractères minimum"
                className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-1.5">Confirmer</label>
              <input
                type="password"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                required
                placeholder="Répétez le mot de passe"
                className="w-full bg-[#1A1A1A] border border-[#2E2E2E] rounded-lg px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500/20 transition-colors"
              />
            </div>
            {msg && (
              <p className={`text-sm px-3 py-2 rounded-lg border ${msg.ok ? 'text-green-400 bg-green-500/10 border-green-500/20' : 'text-red-400 bg-red-500/10 border-red-500/20'}`}>
                {msg.text}
              </p>
            )}
            <button
              type="submit"
              disabled={saving}
              className="w-full bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Mise à jour…' : 'Mettre à jour le mot de passe'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
