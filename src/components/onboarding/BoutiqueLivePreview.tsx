import { getBoutiqueTheme, withAlpha } from '@/lib/theme'

interface Props {
  name: string
  category?: string
  city?: string
  logoUrl?: string
  coverUrl?: string
  primaryColor: string
  theme: string
}

const SAMPLE_PRODUCTS = [
  { name: 'Produit exemple', price: '10 000 FCFA' },
  { name: 'Autre produit', price: '7 500 FCFA' },
]

export function BoutiqueLivePreview({ name, category, city, logoUrl, coverUrl, primaryColor, theme }: Props) {
  const { accent, pageBg, pageText, cardBg, cardBorder, subtleText } = getBoutiqueTheme({ primary_color: primaryColor, theme })

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 text-sm" style={{ backgroundColor: pageBg }}>
      <p className="text-[10px] text-gray-400 px-4 pt-3 pb-1 font-medium uppercase tracking-wider bg-gray-50">Prévisualisation de votre boutique</p>

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
        ) : (
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-xs flex-shrink-0" style={{ backgroundColor: accent }}>
            {name.charAt(0) || 'T'}
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-xs truncate" style={{ color: pageText }}>{name || 'Nom de votre boutique'}</p>
          <p className="text-[9px] uppercase tracking-wide truncate" style={{ color: subtleText }}>{category || 'Catégorie'}</p>
        </div>
      </div>

      {/* Hero */}
      <div className="relative h-28">
        {coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
        ) : (
          <div className="absolute inset-0" style={{ backgroundColor: withAlpha(accent, '22') }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.5) 100%)' }} />
        <div className="absolute bottom-2.5 left-3 right-3">
          <p className="text-[9px] font-bold uppercase tracking-widest text-white/70">{category || 'Catégorie'}</p>
          <p className="font-black text-white text-lg leading-tight truncate">{name || 'Nom de votre boutique'}</p>
          {city && <p className="text-[10px] text-white/70">{city}</p>}
        </div>
      </div>

      {/* Products */}
      <div className="p-3">
        <div className="grid grid-cols-2 gap-2">
          {SAMPLE_PRODUCTS.map(p => (
            <div key={p.name} className="rounded-xl overflow-hidden" style={{ backgroundColor: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="h-12" style={{ backgroundColor: withAlpha(accent, '33') }} />
              <div className="px-2 py-1.5">
                <p className="text-[10px] font-medium truncate" style={{ color: pageText }}>{p.name}</p>
                <p className="text-[10px] font-bold" style={{ color: accent }}>{p.price}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-3 py-2 rounded-xl text-center text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>
          Commander sur WhatsApp
        </div>
      </div>
    </div>
  )
}
