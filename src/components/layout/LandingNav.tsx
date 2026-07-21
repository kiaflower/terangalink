'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'

const LINKS = [
  { label: 'Accueil', href: '/' },
  { label: 'Boutiques', href: '/boutiques' },
  { label: 'Tarifs', href: '/pour-les-boutiques#tarifs' },
]

export function LandingNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="border-b border-gray-100 sticky top-0 z-20 bg-white">
      <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/"><Logo textClassName="text-xl font-bold text-gradient" /></Link>

        <div className="hidden sm:flex items-center gap-6">
          {LINKS.map(link => (
            <Link key={link.label} href={link.href} className="text-sm font-medium text-gray-600 hover:text-brand-orange transition-colors">
              {link.label}
            </Link>
          ))}
          <Link href="/login" className="text-sm text-brand-orange font-medium">Connexion</Link>
        </div>

        <button
          onClick={() => setOpen(o => !o)}
          className="sm:hidden p-2 -mr-2 text-gray-600"
          aria-label={open ? 'Fermer le menu' : 'Ouvrir le menu'}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="sm:hidden border-t border-gray-100 px-4 py-3 flex flex-col gap-1">
          {LINKS.map(link => (
            <Link key={link.label} href={link.href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-gray-600 hover:text-brand-orange transition-colors py-2.5">
              {link.label}
            </Link>
          ))}
          <Link href="/login" onClick={() => setOpen(false)} className="text-sm text-brand-orange font-medium py-2.5">
            Connexion
          </Link>
        </div>
      )}
    </nav>
  )
}
