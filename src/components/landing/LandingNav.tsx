'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, MessageCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

const SIGNUP_MSG = encodeURIComponent("Bonjour, j'ai découvert TerangaLink et je souhaite inscrire mon restaurant.")

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [whatsapp, setWhatsapp] = useState('221700000000')
  const supabase = createClient()

  useEffect(() => {
    // Fetch WhatsApp from platform settings
    supabase.from('platform_settings').select('value').eq('key', 'whatsapp').single()
      .then(({ data }) => { if (data?.value) setWhatsapp(data.value) })
  }, [supabase])

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const whatsappUrl = `https://wa.me/${whatsapp.replace(/\D/g, '')}?text=${SIGNUP_MSG}`

  return (
    <nav className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-surface/90 backdrop-blur-md border-b border-surface-200' : 'bg-transparent'
    )}>
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-white text-xl">TerangaLink</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Fonctionnalités', 'Tarifs', 'Témoignages', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`} className="text-sm text-gray-400 hover:text-white transition-colors">
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors font-medium px-4 py-2">
              Se connecter
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              <MessageCircle className="w-4 h-4" />Commencer
            </a>
          </div>

          <button className="md:hidden p-2 text-gray-400 hover:text-white transition-colors" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-surface-50 border-t border-surface-200 px-4 py-4 space-y-2">
          {['Fonctionnalités', 'Tarifs', 'Témoignages', 'FAQ'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="block py-2.5 text-gray-400 hover:text-white text-sm transition-colors"
              onClick={() => setMobileOpen(false)}>{item}</a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="block text-center py-2.5 border border-surface-300 text-gray-300 hover:text-white rounded-xl text-sm font-medium transition-colors">
              Se connecter
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl text-sm font-semibold transition-colors">
              <MessageCircle className="w-4 h-4" />Créer mon restaurant
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
