interface OpenStreetMapProps {
  address: string
  city?: string
  className?: string
}

export function OpenStreetMap({ address, city = 'Dakar', className }: OpenStreetMapProps) {
  const query = encodeURIComponent(`${address}, ${city}, Sénégal`)
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=-17.5,14.6,-17.3,14.8&layer=mapnik&marker=14.7,-17.4`
  const searchUrl = `https://www.openstreetmap.org/search?query=${query}`

  return (
    <div className={className}>
      <div className="relative w-full h-48 rounded-xl overflow-hidden border border-surface-200">
        <iframe
          title="Carte"
          src={src}
          className="w-full h-full"
          loading="lazy"
          style={{ filter: 'invert(90%) hue-rotate(180deg)' }}
        />
      </div>
      <a
        href={searchUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="text-brand-orange text-xs mt-2 inline-block hover:underline"
      >
        Voir sur OpenStreetMap →
      </a>
    </div>
  )
}
