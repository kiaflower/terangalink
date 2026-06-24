'use client'

import { usePathname } from 'next/navigation'
import { OnboardingGuide } from './OnboardingGuide'

interface OnboardingWrapperProps {
  restaurantSlug?: string
}

export function OnboardingWrapper({ restaurantSlug }: OnboardingWrapperProps) {
  const pathname = usePathname()
  return <OnboardingGuide currentPath={pathname} restaurantSlug={restaurantSlug} />
}
