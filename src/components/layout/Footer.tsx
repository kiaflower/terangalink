import Link from 'next/link'
import { Zap, MessageCircle, Mail, MapPin } from 'lucide-react'

interface FooterProps {
  whatsapp?: string
  email?: string
  city?: string
}

export function Footer({ whatsapp = '221774739266', email = 'support@terangalink.sn', city = 'Dakar, Sénégal' }: FooterProps) {
  return (
    <footer style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB' }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 mb-8">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: '#F97316' }}>
                <Zap className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-bold" style={{ color: '#111111' }}>TerangaLink</span>
            </div>
            <p className="text-sm leading-relaxed" style={{ color: '#9CA3AF' }}>
              La plateforme de commande pour les pros de la food au Sénégal et en Afrique de l&apos;Ouest.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: '#111111' }}>Navigation</p>
            <div className="space-y-2">
              {[
                { label: 'Restaurants', href: '/restaurants' },
                { label: 'Rejoindre TerangaLink', href: '/pour-les-restaurants' },
                { label: 'Tarifs', href: '/pour-les-restaurants#tarifs' },
                { label: 'FAQ', href: '/pour-les-restaurants#faq' },
                { label: 'Mentions légales', href: '/legal' },
              ].map(link => (
                <Link key={link.label} href={link.href}
                  className="block text-sm transition-colors hover:text-orange-500"
                  style={{ color: '#9CA3AF' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Contact */}
          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: '#111111' }}>Contact</p>
            <div className="space-y-3">
              <a href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm transition-colors hover:text-green-600"
                style={{ color: '#9CA3AF' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(37,211,102,0.1)' }}>
                  <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
                </div>
                +{whatsapp}
              </a>
              <a href={`mailto:${email}`}
                className="flex items-center gap-2.5 text-sm transition-colors hover:text-orange-500"
                style={{ color: '#9CA3AF' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
                  <Mail className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                </div>
                {email}
              </a>
              <div className="flex items-center gap-2.5 text-sm" style={{ color: '#9CA3AF' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: '#F3F4F6' }}>
                  <MapPin className="w-3.5 h-3.5" style={{ color: '#9CA3AF' }} />
                </div>
                {city}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid #F3F4F6' }}>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            © 2026 TerangaLink — Fait à Dakar avec passion
          </p>
          <div className="flex gap-4 text-xs" style={{ color: '#9CA3AF' }}>
            <a href="/legal" className="hover:text-orange-500 transition-colors">Mentions légales</a>
            <a href="/legal#confidentialite" className="hover:text-orange-500 transition-colors">Confidentialité</a>
          </div>
        </div>
      </div>
    </footer>
  )
}
