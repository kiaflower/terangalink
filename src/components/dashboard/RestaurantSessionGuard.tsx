'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const POLL_INTERVAL_MS = 45_000

/**
 * Poll léger qui détecte une déconnexion forcée (changement du mot de passe
 * partagé, suppression d'un admin secondaire) pendant qu'un admin reste
 * inactif sur une page sans naviguer — le middleware seul ne suffit pas
 * dans ce cas puisqu'il ne s'exécute qu'à la navigation. Jamais déclenché en
 * mode impersonation, /api/auth/session-check l'exempte déjà.
 */
export function RestaurantSessionGuard() {
  const router = useRouter()
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function poll() {
      try {
        const res = await fetch('/api/auth/session-check', { cache: 'no-store' })
        if (cancelled || res.ok) return
        const data = await res.json().catch(() => ({}))
        const disabled = data.reason === 'account_disabled'
        setMessage(disabled ? 'Vous avez été déconnecté.' : 'Le mot de passe a été modifié depuis votre connexion.')
        setTimeout(() => router.push(`/login?reason=${disabled ? 'account_disabled' : 'session_expired'}`), 2000)
      } catch {
        // Souci réseau ponctuel — on retentera au prochain cycle.
      }
    }

    const interval = setInterval(poll, POLL_INTERVAL_MS)
    return () => { cancelled = true; clearInterval(interval) }
  }, [router])

  if (!message) return null

  return (
    <div className="fixed inset-0 z-[9999] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl px-6 py-5 max-w-sm text-center shadow-2xl">
        <p className="text-sm font-semibold text-gray-900">{message}</p>
        <p className="text-xs text-gray-400 mt-1">Redirection…</p>
      </div>
    </div>
  )
}
