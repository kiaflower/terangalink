'use client'

import { useState } from 'react'

export function UserRowActions({ boutiqueId, boutiqueName }: { boutiqueId: string; boutiqueName: string }) {
  const [loading, setLoading] = useState(false)

  async function resetPassword() {
    if (!confirm(`Réinitialiser le mot de passe partagé de "${boutiqueName}" ? Toutes les sessions actives seront déconnectées et le nouveau mot de passe sera envoyé par email à l'admin principal.`)) return
    setLoading(true)
    try {
      const res = await fetch('/api/super-admin/reset-boutique-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ boutique_id: boutiqueId }),
      })
      const result = await res.json()
      if (res.ok) {
        alert(result.sent_to ? `Nouveau mot de passe envoyé à ${result.sent_to}.` : 'Mot de passe réinitialisé, mais aucun admin principal trouvé pour l\'envoi.')
      } else {
        alert(result.error || 'Erreur lors de la réinitialisation')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={resetPassword}
      disabled={loading}
      className="text-xs text-gray-500 border border-gray-200 px-3 py-1.5 rounded-lg hover:border-brand-violet/30 hover:text-brand-violet transition-colors disabled:opacity-50"
    >
      {loading ? '...' : 'Réinitialiser le mot de passe'}
    </button>
  )
}
