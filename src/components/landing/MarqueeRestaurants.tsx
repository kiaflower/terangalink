'use client'

interface MarqueeRestaurantsProps {
  names: string[]
}

export function MarqueeRestaurants({ names }: MarqueeRestaurantsProps) {
  if (names.length === 0) return null

  // On triplice pour garantir qu'il n'y a jamais de vide visible
  const items = [...names, ...names, ...names]
  const speed = Math.max(names.length * 4, 25) // secondes

  return (
    <div
      className="overflow-hidden py-4 relative"
      style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #F3F4F6', borderBottom: '1px solid #F3F4F6' }}
      aria-hidden="true"
    >
      {/* Dégradés bords — fondu propre */}
      <div className="absolute left-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to right, #FFFFFF 40%, transparent)' }} />
      <div className="absolute right-0 top-0 bottom-0 w-24 z-10 pointer-events-none"
        style={{ background: 'linear-gradient(to left, #FFFFFF 40%, transparent)' }} />

      {/* Piste — se déplace de 0 à -33.33% (= 1 copie sur 3) et recommence */}
      <div
        className="flex"
        style={{
          width: 'max-content',
          animation: `marqueeSlide ${speed}s linear infinite`,
          willChange: 'transform',
        }}
      >
        {items.map((name, i) => (
          <span
            key={i}
            className="whitespace-nowrap text-sm font-medium flex-shrink-0 px-1"
            style={{ color: '#9CA3AF' }}
          >
            {name}
            <span className="mx-4 select-none" style={{ color: '#D1D5DB' }}>·</span>
          </span>
        ))}
      </div>

      <style>{`
        @keyframes marqueeSlide {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-restaurants-track { animation: none !important; }
        }
      `}</style>
    </div>
  )
}
