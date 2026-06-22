'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X, Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

interface MobileNavProps {
  children: React.ReactNode
}

export function MobileNav({ children }: MobileNavProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 py-3 bg-surface-50 border-b border-surface-200 sticky top-0 z-30">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-7 h-7 rounded-lg object-cover" />
          <span className="font-bold text-white">TerangaLink</span>
        </Link>
        <button
          onClick={() => setOpen(true)}
          className="p-2 text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="relative w-72 bg-surface-50 border-r border-surface-200 flex flex-col h-full overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-surface-200">
              <span className="font-bold text-white">Menu</span>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div onClick={() => setOpen(false)}>{children}</div>
          </div>
        </div>
      )}
    </>
  )
}
