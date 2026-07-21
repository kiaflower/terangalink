'use client'

import { useState } from 'react'
import { Star, Send, CheckCircle2 } from 'lucide-react'

interface ReviewFormProps {
  orderId: string
  boutiqueId: string
  customerName: string
  onSubmitted?: () => void
  accentColor?: string
  cardBg?: string
  cardBorder?: string
  pageText?: string
  subtleText?: string
}

export function ReviewForm({
  orderId,
  boutiqueId,
  customerName,
  onSubmitted,
  accentColor = '#7C3AED',
  cardBg = '#FFFFFF',
  cardBorder = '#E5E7EB',
  pageText = '#111111',
  subtleText = '#6B7280',
}: ReviewFormProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [comment, setComment] = useState('')
  const [name, setName] = useState(customerName)
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit() {
    if (rating === 0) { setError('Veuillez sélectionner une note.'); return }
    setLoading(true)
    setError(null)

    const res = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        boutique_id: boutiqueId,
        order_id: orderId,
        customer_name: name.trim() || null,
        rating,
        comment: comment.trim() || null,
      }),
    })

    setLoading(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || "Erreur lors de l'envoi.")
      return
    }
    setDone(true)
    onSubmitted?.()
  }

  if (done) {
    return (
      <div className="rounded-2xl px-5 py-6 text-center space-y-2" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
        <CheckCircle2 className="w-8 h-8 mx-auto" style={{ color: accentColor }} />
        <p className="font-bold text-sm" style={{ color: pageText }}>Merci pour votre avis !</p>
        <p className="text-xs" style={{ color: subtleText }}>Votre retour aide la boutique à s&apos;améliorer.</p>
      </div>
    )
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
      <div className="px-5 py-4" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <h2 className="font-bold text-sm" style={{ color: pageText }}>Donnez votre avis</h2>
        <p className="text-xs mt-0.5" style={{ color: subtleText }}>Comment s&apos;est passée votre commande ?</p>
      </div>

      <div className="px-5 py-4 space-y-4">
        <div>
          <p className="text-xs font-semibold mb-2" style={{ color: subtleText }}>Note</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                onMouseEnter={() => setHovered(n)}
                onMouseLeave={() => setHovered(0)}
                onClick={() => setRating(n)}
                className="transition-transform hover:scale-110"
              >
                <Star
                  className="w-8 h-8 transition-colors"
                  style={{
                    color: n <= (hovered || rating) ? accentColor : '#E5E7EB',
                    fill: n <= (hovered || rating) ? accentColor : 'transparent',
                  }}
                />
              </button>
            ))}
          </div>
          {rating > 0 && (
            <p className="text-xs mt-1" style={{ color: subtleText }}>
              {['', 'Très mauvais', 'Mauvais', 'Correct', 'Bien', 'Excellent !'][rating]}
            </p>
          )}
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: subtleText }}>
            Commentaire (optionnel)
          </label>
          <textarea
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
            placeholder="Partagez votre expérience..."
            className="w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-violet/30 transition-all border border-gray-200 text-gray-900"
          />
        </div>

        <div>
          <label className="text-xs font-semibold block mb-1.5" style={{ color: subtleText }}>
            Votre prénom (optionnel)
          </label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Anonyme"
            className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-violet/30 transition-all border border-gray-200 text-gray-900"
          />
        </div>

        {error && <p className="text-xs text-red-500">{error}</p>}

        <button
          onClick={submit}
          disabled={loading || rating === 0}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ backgroundColor: accentColor }}
        >
          {loading ? (
            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {loading ? 'Envoi...' : 'Envoyer mon avis'}
        </button>
      </div>
    </div>
  )
}
