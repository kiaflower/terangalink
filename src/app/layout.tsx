import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import './globals.css'

const inter = GeistSans

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
