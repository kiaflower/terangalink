'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Restaurant {
  slug: string
  name: string
  logo_url: string | null
  cuisine_type: string | null
}

interface Props {
  restaurant: Restaurant
  accent: string
  pageText: string
  subtleText: string
}

// Isolé dans son propre composant client (avec useSearchParams) pour que la lecture
// de searchParams ne force pas le Server Component parent à sortir de l'ISR : lire
// `searchParams` dans la page elle-même désactiverait le cache/revalidate=300 pour
// TOUTES les requêtes, même celles sans query string (ex: Googlebot sur l'URL canonique).
//
// Rend le header de la page plat (logo + nom du restaurant, lien vers son site)
// et, selon la provenance (?from=annuaire ou ?from=accueil), un lien "Retour" vers
// l'annuaire ou vers l'accueil — ce même paramètre est forwardé sur le lien restaurant
// pour que le bouton retour reste disponible une fois sur la page du restaurant.
export function ProductPageHeaderLinks({ restaurant, accent, pageText, subtleText }: Props) {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const fromAnnuaire = from === 'annuaire'
  const fromAccueil = from === 'accueil'
  const restaurantHref = from ? `/${restaurant.slug}?from=${from}` : `/${restaurant.slug}`

  return (
    <>
      <Link href={restaurantHref} className="flex items-center gap-2.5 min-w-0">
        {restaurant.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={restaurant.logo_url} alt={restaurant.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: accent }}>
            {restaurant.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight truncate" style={{ color: pageText }}>{restaurant.name}</p>
          {restaurant.cuisine_type && (
            <p className="text-[10px] uppercase tracking-wider truncate" style={{ color: subtleText }}>{restaurant.cuisine_type}</p>
          )}
        </div>
      </Link>
      {fromAnnuaire && (
        <Link href="/restaurants" className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0 transition-colors" style={{ color: subtleText }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à l&apos;annuaire
        </Link>
      )}
      {fromAccueil && (
        <Link href="/" className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0 transition-colors" style={{ color: subtleText }}>
          <ArrowLeft className="w-3.5 h-3.5" />
          Retour à l&apos;accueil
        </Link>
      )}
    </>
  )
}
