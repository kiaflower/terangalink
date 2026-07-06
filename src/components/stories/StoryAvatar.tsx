'use client'

import type { StoryRestaurantSummary } from '@/lib/types'

interface StoryAvatarProps {
  restaurant: StoryRestaurantSummary
  onClick: () => void
  seen?: boolean
}

export function StoryAvatar({ restaurant, onClick, seen = false }: StoryAvatarProps) {
  return (
    <button onClick={onClick} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-[68px] group">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center transition-transform group-active:scale-95"
        style={{
          border: seen ? '2.5px solid #D1D5DB' : '2.5px solid #F97316',
          filter: seen ? 'none' : 'drop-shadow(0 0 6px rgba(249,115,22,0.35))',
        }}
      >
        <div className="w-[54px] h-[54px] rounded-full overflow-hidden bg-white p-[2px]">
          {restaurant.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={restaurant.logo_url} alt={restaurant.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <div
              className="w-full h-full rounded-full flex items-center justify-center font-black text-white"
              style={{ backgroundColor: '#F97316' }}
            >
              {restaurant.name.charAt(0).toUpperCase()}
            </div>
          )}
        </div>
      </div>
      <span className="text-[11px] font-medium text-center truncate w-full" style={{ color: '#374151' }}>
        {restaurant.name}
      </span>
    </button>
  )
}
