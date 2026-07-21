import Link from 'next/link'
import { PartyPopper } from 'lucide-react'

export default function MerciPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-6"><PartyPopper className="w-16 h-16 text-brand-violet" /></div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Demande envoyée !</h1>
        <p className="text-gray-500 mb-8">
          Nous avons bien reçu votre demande de création de boutique. Notre équipe va l&apos;examiner et vous contactera dans les 24h.
        </p>
        <Link href="/" className="inline-block bg-brand-violet text-white px-8 py-3 rounded-2xl font-semibold hover:bg-brand-violet-dark transition-colors">
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
