'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'

interface Photo {
  src: string
  href: string
}

interface ProductPhotosGridProps {
  photos: Photo[]
}

// Affiche 4 photos plat cliquables (vers leur vraie page dans l'annuaire). Toutes
// les 5s, une seule tuile (à tour de rôle) passe à la photo suivante du pool — un
// changement successif plutôt que les 4 qui sautent en même temps.
export function ProductPhotosGrid({ photos }: ProductPhotosGridProps) {
  const count = Math.min(4, photos.length)
  const [tiles, setTiles] = useState<Photo[]>(() => photos.slice(0, count))
  const tileTurn = useRef(0)
  const poolPointer = useRef(count)

  useEffect(() => {
    if (photos.length <= count) return
    const id = setInterval(() => {
      const tileToUpdate = tileTurn.current % count
      const nextPhoto = photos[poolPointer.current % photos.length]
      tileTurn.current += 1
      poolPointer.current += 1
      setTiles(prev => {
        const next = [...prev]
        next[tileToUpdate] = nextPhoto
        return next
      })
    }, 5000)
    return () => clearInterval(id)
  }, [photos, count])

  if (count === 0) return null

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {tiles.map((photo, i) => (
        <Link key={i} href={photo.href} className="block group overflow-hidden rounded-2xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img key={photo.src} src={photo.src} alt=""
            className="fade-in-photo w-full aspect-square object-cover transition-transform duration-300 group-hover:scale-105" />
        </Link>
      ))}
    </div>
  )
}
