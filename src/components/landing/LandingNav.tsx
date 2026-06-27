'use client'

import Link from 'next/link'
import { useState, useEffect } from 'react'
import { Menu, X, MessageCircle, UtensilsCrossed } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

const SIGNUP_MSG = encodeURIComponent("Bonjour, j'ai découvert TerangaLink et je souhaite inscrire mon restaurant.")

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [whatsapp, setWhatsapp] = useState('221700000000')
  const supabase = createClient()

  useEffect(() => {
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
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
      style={{
        backgroundColor: scrolled ? 'rgba(255,255,255,0.95)' : '#FFFFFF',
        borderBottom: '1px solid #E5E7EB',
        backdropFilter: scrolled ? 'blur(8px)' : 'none',
      }}
    >
      <div className="container-app">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/logo-terangalink.jpg" alt="TerangaLink" className="w-8 h-8 rounded-lg object-cover" />
            <span className="font-bold text-xl" style={{ color: '#111111' }}>TerangaLink</span>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {['Fonctionnalités', 'Tarifs', 'Témoignages', 'FAQ'].map(item => (
              <a key={item} href={`#${item.toLowerCase()}`}
                className="text-sm font-medium transition-colors hover:text-orange-500"
                style={{ color: '#6B7280' }}>
                {item}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              href="/restaurants"
              className="inline-flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-xl transition-colors hover:opacity-90"
              style={{ color: '#F97316', backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}
            >
              <UtensilsCrossed className="w-3.5 h-3.5" />
              Restaurants
            </Link>
            <Link href="/login"
              className="text-sm font-medium px-4 py-2 transition-colors hover:text-orange-500"
              style={{ color: '#6B7280' }}>
              Se connecter
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-all hover:opacity-90"
              style={{ backgroundColor: '#F97316' }}>
              <MessageCircle className="w-4 h-4" />Créer mon restaurant
            </a>
          </div>

          <button className="md:hidden p-2 transition-colors" style={{ color: '#6B7280' }} onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden px-4 py-4 space-y-2" style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB' }}>
          {['Fonctionnalités', 'Tarifs', 'Témoignages', 'FAQ'].map(item => (
            <a key={item} href={`#${item.toLowerCase()}`}
              className="block py-2.5 text-sm font-medium transition-colors hover:text-orange-500"
              style={{ color: '#6B7280' }}
              onClick={() => setMobileOpen(false)}>{item}</a>
          ))}
          <div className="pt-2 flex flex-col gap-2">
            <Link href="/restaurants" onClick={() => setMobileOpen(false)}
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
              style={{ color: '#F97316', backgroundColor: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.2)' }}>
              <UtensilsCrossed className="w-4 h-4" />Voir les restaurants
            </Link>
            <Link href="/login" onClick={() => setMobileOpen(false)}
              className="block text-center py-2.5 rounded-xl text-sm font-medium transition-colors"
              style={{ color: '#6B7280', border: '1px solid #E5E7EB' }}>
              Se connecter
            </Link>
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white"
              style={{ backgroundColor: '#F97316' }}>
              <MessageCircle className="w-4 h-4" />Créer mon restaurant
            </a>
          </div>
        </div>
      )}
    </nav>
  )
}
