'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface VariantSelectionContextValue {
  selectedVariants: Record<string, string>
  setVariant: (name: string, option: string) => void
}

// Partagée entre la galerie (photo qui doit changer avec la variante) et le
// panneau de commande (boutons de sélection) — les deux sont des enfants
// distants du même grid produit, sans ancêtre client commun autrement.
const VariantSelectionContext = createContext<VariantSelectionContextValue | null>(null)

export function VariantSelectionProvider({ children }: { children: ReactNode }) {
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({})
  function setVariant(name: string, option: string) {
    setSelectedVariants(prev => ({ ...prev, [name]: option }))
  }
  return (
    <VariantSelectionContext.Provider value={{ selectedVariants, setVariant }}>
      {children}
    </VariantSelectionContext.Provider>
  )
}

export function useVariantSelection() {
  const ctx = useContext(VariantSelectionContext)
  if (!ctx) throw new Error('useVariantSelection must be used within VariantSelectionProvider')
  return ctx
}
