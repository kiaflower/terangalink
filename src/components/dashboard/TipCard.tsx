'use client'

import { useEffect, useState } from 'react'
import { Lightbulb, X } from 'lucide-react'

const TIPS = [
  // Menu
  "Les plats avec photo se commandent 5× plus souvent. Ajoutez des images à vos articles.",
  "Organisez votre menu en catégories claires — Entrées, Plats, Boissons, Desserts.",
  "Mettez à jour vos prix régulièrement pour éviter les mauvaises surprises.",
  // Commandes & WhatsApp
  "Répondez rapidement sur WhatsApp — un client qui attend plus de 5 min commande ailleurs.",
  "Activez les notifications WhatsApp pour ne rater aucune commande.",
  // Fidélisation
  "Un code promo de bienvenue augmente les premières commandes. Créez-en un depuis Promotions.",
  "Demandez à vos clients satisfaits de laisser un avis — ça booste votre visibilité.",
  // QR Code
  "Imprimez votre QR Code et collez-le sur vos emballages et les murs de votre restaurant.",
]

const DISMISSED_KEY = 'tl_tip_dismissed_at'
const INDEX_KEY = 'tl_tip_index'
const COOLDOWN_MS = 3 * 24 * 60 * 60 * 1000 // 3 jours

export function TipCard() {
  const [visible, setVisible] = useState(false)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    try {
      const dismissedAt = localStorage.getItem(DISMISSED_KEY)
      if (dismissedAt) {
        const elapsed = Date.now() - Number(dismissedAt)
        if (elapsed < COOLDOWN_MS) {
          setVisible(false)
          return
        }
        // Cooldown expiré : réinitialiser
        localStorage.removeItem(DISMISSED_KEY)
      }

      // Choisir un tip (rotatif)
      const stored = localStorage.getItem(INDEX_KEY)
      let idx = stored !== null ? (Number(stored) + 1) % TIPS.length : Math.floor(Math.random() * TIPS.length)
      localStorage.setItem(INDEX_KEY, String(idx))
      setTipIndex(idx)
      setVisible(true)
    } catch {
      // SSR / localStorage non dispo
    }
  }, [])

  function dismiss() {
    try {
      localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      className="flex items-start gap-3 rounded-2xl p-4 mb-6"
      style={{
        backgroundColor: '#FFFBF5',
        border: '1px solid rgba(249,115,22,0.1)',
      }}
    >
      <div className="flex-shrink-0 mt-0.5">
        <Lightbulb className="w-5 h-5" style={{ color: '#F97316' }} />
      </div>
      <p className="flex-1 text-sm" style={{ color: '#374151' }}>
        {TIPS[tipIndex]}
      </p>
      <button
        onClick={dismiss}
        className="flex-shrink-0 text-gray-300 hover:text-gray-500 transition-colors"
        aria-label="Fermer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
