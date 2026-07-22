'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import type { CSSProperties, ReactNode } from 'react'

interface Props {
  slug: string
  className?: string
  style?: CSSProperties
  children: ReactNode
}

// Forwarde ?from=annuaire ou ?from=accueil vers le restaurant selon la provenance,
// pour que le bouton retour reste disponible une fois sur place — voir
// ProductPageHeaderLinks pour le détail de l'isolation client (ISR).
export function RestaurantLink({ slug, className, style, children }: Props) {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const suffix = from === 'annuaire' || from === 'accueil' ? `?from=${from}` : ''
  return <Link href={`/${slug}${suffix}`} className={className} style={style}>{children}</Link>
}
