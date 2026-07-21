'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

const links = [
  { href: '/boutiques', label: 'Annuaire' },
  { href: '/pour-les-boutiques#fonctionnalites', label: 'Fonctionnalités' },
  { href: '/pour-les-boutiques#tarifs', label: 'Tarifs' },
  { href: '/pour-les-boutiques#faq', label: 'FAQ' },
  { href: '/inscription', label: 'Créer ma boutique' },
]

export function MobileMenu() {
  const [open, setOpen] = useState(false)

  return (
    <div className="md:hidden">
      <button onClick={() => setOpen(true)} aria-label="Menu" className="p-2 text-gray-700">
        <Menu className="w-5 h-5" />
      </button>
      {open && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          <div className="flex items-center justify-between px-6 py-5" style={{ borderBottom: '1px solid #F3F4F6' }}>
            <Logo textClassName="font-bold text-xl" textStyle={{ color: '#111111' }} />
            <button onClick={() => setOpen(false)} aria-label="Fermer"><X className="w-5 h-5 text-gray-700" /></button>
          </div>
          <nav className="flex flex-col gap-1 p-6">
            {links.map(l => (
              <Link key={l.href} href={l.href} onClick={() => setOpen(false)}
                className="py-3 text-base font-medium text-gray-900 border-b border-gray-100">
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </div>
  )
}
