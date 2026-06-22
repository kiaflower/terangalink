import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})

export const metadata = {
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export const metadata: Metadata = {
  title: {
    default: 'TerangaLink — La plateforme de commande pour restaurants',
    template: '%s | TerangaLink',
  },
  description: 'TerangaLink donne à chaque restaurant son propre site de commande professionnel — rapide, beau et adapté au mobile.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans bg-surface text-white antialiased`}>
        {children}
      </body>
    </html>
  )
}
