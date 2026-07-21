'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface Boutique {
  slug: string
  name: string
  logo_url: string | null
  shop_category: string | null
}

interface Props {
  boutique: Boutique
  accent: string
  pageText: string
  subtleText: string
}

// Isolé dans son propre composant client (avec useSearchParams) pour que la lecture
// de searchParams ne force pas le Server Component parent à sortir de l'ISR : lire
// `searchParams` dans la page elle-même désactiverait le cache/revalidate=300 pour
// TOUTES les requêtes, même celles sans query string (ex: Googlebot sur l'URL canonique).
//
// Rend le header de la page produit (logo + nom de la boutique, lien vers son site)
// et, selon la provenance (?from=annuaire ou ?from=accueil), un lien "Retour" vers
// l'annuaire ou vers l'accueil — ce même paramètre est forwardé sur le lien boutique
// pour que le bouton retour reste disponible une fois sur la page de la boutique.
export function ProductPageHeaderLinks({ boutique, accent, pageText, subtleText }: Props) {
  const searchParams = useSearchParams()
  const from = searchParams.get('from')
  const fromAnnuaire = from === 'annuaire'
  const fromAccueil = from === 'accueil'
  const boutiqueHref = from ? `/${boutique.slug}?from=${from}` : `/${boutique.slug}`

  return (
    <>
      <Link href={boutiqueHref} className="flex items-center gap-2.5 min-w-0">
        {boutique.logo_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={boutique.logo_url} alt={boutique.name} className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0" style={{ backgroundColor: accent }}>
            {boutique.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-sm leading-tight truncate" style={{ color: pageText }}>{boutique.name}</p>
          {boutique.shop_category && (
            <p className="text-[10px] uppercase tracking-wider truncate" style={{ color: subtleText }}>{boutique.shop_category}</p>
          )}
        </div>
      </Link>
      {fromAnnuaire && (
        <Link href="/boutiques" className="inline-flex items-center gap-1.5 text-xs font-medium shrink-0 transition-colors" style={{ color: subtleText }}>
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
