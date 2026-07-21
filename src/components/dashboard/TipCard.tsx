'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

const TIPS = [
  "Les produits avec photo se vendent beaucoup plus. Ajoutez des images à votre catalogue.",
  "Organisez votre catalogue en catégories claires pour faciliter la navigation.",
  "Répondez rapidement sur WhatsApp — un client qui attend commande ailleurs.",
  "Un code promo de bienvenue augmente les premières commandes. Créez-en un.",
  "Imprimez votre QR Code et collez-le dans votre boutique ou sur vos emballages.",
  "Demandez à vos clients satisfaits de laisser un avis — ça augmente votre visibilité.",
  "Mettez à jour vos prix régulièrement pour éviter les mauvaises surprises.",
]

const DISMISSED_KEY = 'ts_tip_dismissed_at'
const INDEX_KEY = 'ts_tip_index'
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000

export function TipCard() {
  const [visible, setVisible] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISSED_KEY)
      if (dismissedAt && Date.now() - Number(dismissedAt) < COOLDOWN_MS) {
        setVisible(false)
        return
      }
      if (dismissedAt) localStorage.removeItem(DISMISSED_KEY)
      const stored = localStorage.getItem(INDEX_KEY)
      const idx = stored !== null ? (Number(stored) + 1) % TIPS.length : Math.floor(Math.random() * TIPS.length)
      localStorage.setItem(INDEX_KEY, String(idx))
      setTipIndex(idx)
      setVisible(true)
    } catch {}
  }, [])

  if (!visible) return null

  return (
    <div className="flex items-start gap-3 rounded-2xl p-4 mb-6"
      style={{ backgroundColor: '#F5F3FF', border: '1px solid rgba(124,58,237,0.1)' }}>
      <Lightbulb className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#7C3AED' }} />
      <p className="flex-1 text-sm" style={{ color: '#374151' }}>{TIPS[tipIndex]}</p>
      <button onClick={() => { try { localStorage.setItem(DISMISSED_KEY, String(Date.now())) } catch {} setVisible(false) }}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors" aria-label="Fermer">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
