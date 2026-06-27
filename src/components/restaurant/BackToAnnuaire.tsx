'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme'

export function BackToAnnuaire({ tokens }: { tokens: ThemeTokens }) {
  const params = useSearchParams()
  const fromAnnuaire = params.get('from') === 'annuaire'

  if (!fromAnnuaire) return null

  return (
    <Link
      href="/restaurants"
      className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl transition-colors flex-shrink-0"
      style={{
        backgroundColor: tokens.bgCardHover,
        color: tokens.textSecondary,
        border: `1px solid ${tokens.border}`,
      }}
    >
      <ArrowLeft className="w-3.5 h-3.5" />
      <span className="hidden sm:inline">Retour à l'annuaire</span>
      <span className="sm:hidden">Annuaire</span>
    </Link>
  )
}
