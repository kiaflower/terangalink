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

  useEffect(() => { setOpen(false) }, [pathname])

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
    setTimeout(() => { isClosing.current = false }, 300)
  }

  return (
    <>
      {/* Bouton burger */}
      <button
        onClick={handleOpen}
        className="lg:hidden fixed top-4 left-4 z-30 w-10 h-10 rounded-xl flex items-center justify-center transition-colors shadow-sm"
        style={{ backgroundColor: '#FFFFFF', border: '1px solid #E5E7EB', color: '#6B7280' }}
        aria-label="Ouvrir le menu"
      >
        <Menu className="w-4 h-4" />
      </button>

      {/* Overlay */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <div
        className={`lg:hidden fixed top-0 left-0 bottom-0 z-50 w-72 flex flex-col overflow-y-auto transition-transform duration-300 ease-out ${open ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ backgroundColor: '#FFFFFF', borderRight: '1px solid #E5E7EB' }}
        aria-modal="true"
        role="dialog"
      >
        <div className="flex items-center justify-between p-4 flex-shrink-0" style={{ borderBottom: '1px solid #E5E7EB' }}>
          <div className="flex items-center gap-2">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-7 h-7 rounded-lg object-cover" />
            <span className="font-bold text-sm" style={{ color: '#111111' }}>TerangaLink</span>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg transition-colors"
            style={{ color: '#9CA3AF' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#F3F4F6' }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent' }}
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
