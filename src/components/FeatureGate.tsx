'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import { canUseFeature, type FeatureKey, type PlanKey } from '@/lib/plans'

interface Props {
  plan: PlanKey
  feature: FeatureKey
  children: ReactNode
  fallback?: ReactNode
  /** Ce que débloque précisément la fonctionnalité — affiché à la place du texte générique. */
  description?: string
  /** Plan minimum requis, pour personnaliser le titre (ex: "Starter" si Starter suffit). Par défaut "Pro". */
  requiredPlanLabel?: string
}

export function FeatureGate({ plan, feature, children, fallback, description, requiredPlanLabel = 'Pro' }: Props) {
  if (canUseFeature(plan, feature)) return <>{children}</>
  if (fallback) return <>{fallback}</>

  return (
    <div className="rounded-2xl border border-dashed border-gray-200 p-6 text-center">
      <Lock className="w-6 h-6 mx-auto text-gray-300 mb-2" />
      <p className="text-sm font-semibold text-gray-700">Fonctionnalité réservée au plan {requiredPlanLabel}</p>
      <p className="text-xs text-gray-400 mt-1">
        {description ?? `Passez au plan ${requiredPlanLabel} pour débloquer cette fonctionnalité.`}
      </p>
      <Link href="/dashboard/restaurant/settings#abonnement"
        className="inline-block mt-3 text-xs font-bold text-brand-orange hover:underline">
        Passer au plan {requiredPlanLabel} →
      </Link>
    </div>
  )
}
