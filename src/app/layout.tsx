import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { buildOrganizationSchema, buildWebsiteSchema } from '@/lib/seo'
import { FavoritesProvider } from '@/lib/hooks/useFavorites'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-geist-sans',
  display: 'swap',
  weight: ['400', '500', '600', '700', '800', '900'],
})



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

  description: 'TerangaLink donne à chaque restaurant son propre site ...',

  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/icon.png',
  },
  verification: {
    google: '2Rm5HUVUcyejAAKhDLRqJho7Rct7jyL3H7N1brwuYEQ',
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="dark">
      <body className={`${inter.variable} font-sans bg-surface text-white antialiased`}>
        <script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildOrganizationSchema()) }}
        />
        <script
          id="schema-website"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(buildWebsiteSchema()) }}
        />
        <FavoritesProvider>{children}</FavoritesProvider>
      </body>
    </html>
  )
}
