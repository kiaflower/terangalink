'use client'

import { useEffect, useRef, useState } from 'react'

interface ScrollableDescriptionProps {
  text: string
  textColor: string
  bgColor: string
}

export function ScrollableDescription({ text, textColor, bgColor }: ScrollableDescriptionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [showFade, setShowFade] = useState(false)

  function updateFade() {
    const el = ref.current
    if (!el) return
    // Fondu affiché seulement tant qu'il reste du texte sous la ligne de
    // flottaison — évite qu'un client confonde la coupure visuelle avec la
    // fin réelle de la description.
    setShowFade(el.scrollHeight - el.scrollTop - el.clientHeight > 4)
  }

  useEffect(() => { updateFade() }, [text])

  return (
    <div className="relative mt-4">
      <div
        ref={ref}
        onScroll={updateFade}
        // ~3 lignes visibles (text-sm + leading-relaxed = 1.625 * 0.875rem par
        // ligne) — hauteur fixe et prévisible pour laisser le plus de place
        // possible à la photo, quel que soit le ratio (carré ou portrait).
        className="max-h-[4.3rem] overflow-y-auto text-sm leading-relaxed pr-1"
        style={{ color: textColor }}
      >
        {text}
      </div>
      {showFade && (
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-1 h-5"
          style={{ background: `linear-gradient(to top, ${bgColor}, transparent)` }}
        />
      )}
    </div>
  )
}
