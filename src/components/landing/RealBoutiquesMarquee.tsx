import Link from 'next/link'

interface BoutiqueLogo {
  name: string
  slug: string
  logo_url: string | null
  primary_color: string | null
}

interface RealBoutiquesMarqueeProps {
  boutiques: BoutiqueLogo[]
  dark?: boolean
}

// Défilement horizontal en continu des logos des vraies boutiques actives — inspiré de
// MarqueeBoutiques (texte, décoratif) mais ici chaque logo est un vrai lien cliquable
// vers /[slug]. Fond de dégradé calé sur la couleur de la section qui l'entoure (claire
// par défaut, sombre quand `dark` — bandeau logos sous le hero).
export function RealBoutiquesMarquee({ boutiques, dark = false }: RealBoutiquesMarqueeProps) {
  if (boutiques.length === 0) return null
  const items = [...boutiques, ...boutiques, ...boutiques]
  const speed = Math.max(boutiques.length * 5, 20)
  const edgeColor = dark ? '#0A0A0A' : '#F5F3FF'

  return (
    <div className="overflow-hidden py-2 relative">
      <div className="absolute left-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to right, ${edgeColor} 40%, transparent)` }} />
      <div className="absolute right-0 top-0 bottom-0 w-16 z-10 pointer-events-none"
        style={{ background: `linear-gradient(to left, ${edgeColor} 40%, transparent)` }} />
      <div className="flex items-center gap-10"
        style={{ width: 'max-content', animation: `marqueeSlide ${speed}s linear infinite`, willChange: 'transform' }}>
        {items.map((b, i) => (
          <Link key={`${b.slug}-${i}`} href={`/${b.slug}`}
            className="flex flex-col items-center gap-2 flex-shrink-0 group" title={b.name}>
            {b.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.logo_url} alt={b.name}
                className={`w-16 h-16 rounded-full object-cover border group-hover:border-brand-violet transition-colors ${dark ? 'border-white/10' : 'border-gray-100'}`} />
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-black"
                style={{ backgroundColor: b.primary_color || '#7C3AED' }}>
                {b.name.charAt(0)}
              </div>
            )}
            <span className={`text-xs font-medium transition-colors max-w-[80px] truncate group-hover:text-brand-violet-light ${dark ? 'text-gray-400' : 'text-gray-500'}`}>
              {b.name}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
