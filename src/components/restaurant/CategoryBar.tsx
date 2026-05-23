'use client'

import { useRef } from 'react'
import { cn } from '@/lib/utils'
import type { MenuCategory } from '@/lib/types'

interface CategoryBarProps {
  categories: MenuCategory[]
  activeId: string | null
  onChange: (id: string | null) => void
}

export function CategoryBar({ categories, activeId, onChange }: CategoryBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  if (!categories.length) return null

  return (
    <div className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-surface-200 py-3">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto scrollbar-hide px-4 sm:px-6"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {/* All button */}
        <button
          onClick={() => onChange(null)}
          className={cn(
            'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150',
            activeId === null
              ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
              : 'bg-surface-100 text-gray-400 hover:text-white hover:bg-surface-200'
          )}
        >
          Tout
        </button>

        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            className={cn(
              'flex-shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 whitespace-nowrap',
              activeId === cat.id
                ? 'bg-brand-orange text-white shadow-lg shadow-brand-orange/20'
                : 'bg-surface-100 text-gray-400 hover:text-white hover:bg-surface-200'
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  )
}
