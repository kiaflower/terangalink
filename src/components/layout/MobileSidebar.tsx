'use client'

import { useState, useEffect } from 'react'
import { Menu, X } from 'lucide-react'

interface MobileSidebarProps {
  children: React.ReactNode
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Petit bouton burger fixe en haut à gauche — visible uniquement sur mobile */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-30 w-10 h-10 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-100 transition-colors shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-surface-50 border-r border-surface-200 flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-orange rounded-lg flex items-center justify-center">
              <span className="text-white text-xs font-black">TL</span>
            </div>
            <span className="font-bold text-white text-sm">TerangaLink</span>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-surface-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div onClick={() => setOpen(false)} className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
