'use client'

import { Lock } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getUpgradeLabel, type PlanFeatures } from '@/lib/plans'
import { useSettings, buildWhatsappUrl } from '@/lib/hooks/useSettings'

interface FeatureGateProps {
  feature: keyof PlanFeatures
  hasAccess: boolean
  children: React.ReactNode
  className?: string
}

/**
 * Wraps a feature section. If hasAccess is false:
 * - overlays a premium lock UI
 * - shows which plan unlocks it
 * - does NOT hide content brutally — blurs it elegantly
 */
export function FeatureGate({ feature, hasAccess, children, className }: FeatureGateProps) {
  const settings = useSettings()
  if (hasAccess) return <>{children}</>

  const upgradeLabel = getUpgradeLabel(feature)
  const upgradeUrl = buildWhatsappUrl(settings.whatsapp, "Bonjour, je souhaite upgrader mon abonnement TerangaLink.")

  return (
    <div className={cn('relative', className)}>
      {/* Blurred content */}
      <div className="pointer-events-none select-none" style={{ filter: 'blur(3px)', opacity: 0.4 }}>
        {children}
      </div>

      {/* Lock overlay */}
      <div className="absolute inset-0 flex items-center justify-center rounded-2xl bg-gray-50/80 backdrop-blur-sm border border-gray-200">
        <div className="text-center px-6 py-4">
          <div className="w-10 h-10 bg-brand-orange/10 rounded-xl flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5 text-brand-orange" />
          </div>
          <p className="text-gray-900 font-semibold text-sm mb-1">Fonctionnalité premium</p>
          <p className="text-gray-500 text-xs mb-3">{upgradeLabel}</p>
          <a
            href={upgradeUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 bg-brand-orange/10 hover:bg-brand-orange/20 text-brand-orange text-xs font-semibold px-4 py-2 rounded-full transition-colors border border-brand-orange/20"
          >
            Upgrader mon plan →
          </a>
        </div>
      </div>
    </div>
  )
}
