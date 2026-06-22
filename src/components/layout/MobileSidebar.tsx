'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'

interface MobileSidebarProps {
  children: React.ReactNode
}

export function MobileSidebar({ children }: MobileSidebarProps) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()
  const isClosing = useRef(false)

  // Ferme quand la route change (après navigation)
  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  function handleOpen() {
    if (isClosing.current) return
    setOpen(true)
  }

  function handleClose() {
    isClosing.current = true
    setOpen(false)
    // Empêche une réouverture immédiate involontaire
    setTimeout(() => { isClosing.current = false }, 300)
  }

  return (
    <>
      {/* Bouton burger — visible uniquement sur mobile */}
      <button
        onClick={handleOpen}
        className="lg:hidden fixed top-4 left-4 z-30 w-10 h-10 bg-surface-50 border border-surface-200 rounded-xl flex items-center justify-center text-gray-400 hover:text-white hover:bg-surface-100 transition-colors shadow-lg"
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Overlay — ferme au clic en dehors */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer — NE ferme PAS au clic interne, laisse la navigation agir */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 bg-surface-50 border-r border-surface-200 flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center justify-between p-4 border-b border-surface-200 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-white text-sm">TerangaLink</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-gray-500 hover:text-white transition-colors rounded-lg hover:bg-surface-200"
            aria-label="Fermer le menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          {children}
        </div>
      </div>
    </>
  )
}
