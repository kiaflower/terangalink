'use client'

import { useState } from 'react'
import { Zap, Check, Loader2 } from 'lucide-react'

export function EarlyAccessWaitlistForm() {
  const [prenom, setPrenom] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!prenom.trim() || !whatsapp.trim()) {
      setError('Merci de renseigner votre prénom et votre numéro WhatsApp')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/early-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prenom, whatsapp }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Une erreur est survenue')
        return
      }
      setDone(true)
    } catch {
      setError('Une erreur est survenue, réessayez.')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="rounded-2xl p-5 flex items-start gap-3" style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
        <Check className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#22C55E' }} />
        <p className="text-sm" style={{ color: '#166534' }}>
          Vous êtes sur la liste d&apos;attente. On vous préviendra sur WhatsApp si une place se libère ou dès le lancement officiel.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl p-5 space-y-4" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB' }}>
      <div>
        <p className="font-bold text-sm mb-1" style={{ color: '#111111' }}>Rejoindre la liste d&apos;attente</p>
        <p className="text-xs" style={{ color: '#6B7280' }}>
          Les inscriptions Early Access ne sont pas ouvertes pour le moment. Laissez vos coordonnées pour être averti(e) dès qu&apos;une place se libère ou dès le lancement officiel.
        </p>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="text"
          value={prenom}
          onChange={e => setPrenom(e.target.value)}
          placeholder="Votre prénom"
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
        />
        <input
          type="tel"
          value={whatsapp}
          onChange={e => setWhatsapp(e.target.value)}
          placeholder="Numéro WhatsApp"
          className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
        />
      </div>
      {error && <p className="text-red-500 text-xs">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 font-semibold py-3 rounded-xl text-sm text-white transition-all hover:opacity-90 disabled:opacity-60"
        style={{ backgroundColor: '#111111' }}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
        Rejoindre la liste d&apos;attente
      </button>
    </form>
  )
}
