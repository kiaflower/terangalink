import Link from 'next/link'
import { MessageCircle, Mail, MapPin } from 'lucide-react'
import { getPlatformSettings } from '@/lib/platform-settings'
import { Logo } from '@/components/ui/Logo'

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
    </svg>
  )
}

function FacebookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>
    </svg>
  )
}

function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.589 6.686a4.793 4.793 0 0 1-3.77-4.245V2h-3.445v13.672a2.896 2.896 0 0 1-5.201 1.743l-.002-.001.002.001a2.895 2.895 0 0 1 3.183-4.51v-3.5a6.329 6.329 0 0 0-5.394 10.692 6.33 6.33 0 0 0 10.857-4.424V8.687a8.182 8.182 0 0 0 4.773 1.526V6.79a4.831 4.831 0 0 1-1.003-.104z"/>
    </svg>
  )
}


interface FooterProps {
  whatsapp?: string
  email?: string
  city?: string
}

export async function Footer({
  whatsapp,
  email,
  city = 'Dakar, Sénégal',
}: FooterProps) {
  const settings = await getPlatformSettings()
  const resolvedWhatsapp = whatsapp ?? settings.support_whatsapp
  const resolvedEmail = email ?? settings.support_email

  return (
    <footer style={{ backgroundColor: '#FFFFFF', borderTop: '1px solid #E5E7EB' }} className="py-10">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-8 mb-8">

          <div>
            <Logo textClassName="font-bold text-lg" textStyle={{ color: '#111111' }} />
            <p className="text-sm leading-relaxed mt-3" style={{ color: '#9CA3AF' }}>
              La plateforme de vente pour les restaurateurs du Sénégal.
            </p>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: '#111111' }}>Navigation</p>
            <div className="space-y-2">
              {[
                { label: 'Restaurants', href: '/restaurants' },
                { label: 'Rejoindre TerangaLink', href: '/pour-les-restaurants' },
                { label: 'Tarifs', href: '/pour-les-restaurants#tarifs' },
                { label: 'Mentions légales', href: '/legal' },
              ].map(link => (
                <Link key={link.label} href={link.href}
                  className="block text-sm transition-colors hover:text-brand-orange"
                  style={{ color: '#9CA3AF' }}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: '#111111' }}>Contact</p>
            <div className="space-y-3">
              <a href={`https://wa.me/${resolvedWhatsapp.replace(/\D/g, '')}`} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2.5 text-sm transition-colors hover:text-green-600"
                style={{ color: '#9CA3AF' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(37,211,102,0.1)' }}>
                  <MessageCircle className="w-3.5 h-3.5" style={{ color: '#25D366' }} />
                </div>
                +{resolvedWhatsapp}
              </a>
              <a href={`mailto:${resolvedEmail}`}
                className="flex items-center gap-2.5 text-sm transition-colors hover:text-brand-orange"
                style={{ color: '#9CA3AF' }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: 'rgba(249,115,22,0.08)' }}>
                  <Mail className="w-3.5 h-3.5" style={{ color: '#F97316' }} />
                </div>
                {resolvedEmail}
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

          <div>
            <p className="font-semibold text-sm mb-3" style={{ color: '#111111' }}>Suivez-nous</p>
            <div className="flex gap-3">
              <a href={settings.instagram_url} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:opacity-80 text-gray-500"
                style={{ backgroundColor: '#F3F4F6' }} aria-label="Instagram">
                <InstagramIcon className="w-4 h-4" />
              </a>
              <a href={settings.facebook_url} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:opacity-80 text-gray-500"
                style={{ backgroundColor: '#F3F4F6' }} aria-label="Facebook">
                <FacebookIcon className="w-4 h-4" />
              </a>
              <a href={settings.tiktok_url} target="_blank" rel="noopener noreferrer"
                className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:opacity-80 text-gray-500"
                style={{ backgroundColor: '#F3F4F6' }} aria-label="TikTok">
                <TikTokIcon className="w-4 h-4" />
              </a>
            </div>
          </div>

        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-6"
          style={{ borderTop: '1px solid #F3F4F6' }}>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            © 2026 TerangaLink — Fait à Dakar
          </p>
          <div className="flex gap-4 text-xs" style={{ color: '#9CA3AF' }}>
            <Link href="/legal" className="hover:text-brand-orange transition-colors">Mentions légales</Link>
            <Link href="/legal#confidentialite" className="hover:text-brand-orange transition-colors">Confidentialité</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
