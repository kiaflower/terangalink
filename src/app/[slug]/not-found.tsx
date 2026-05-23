import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function RestaurantNotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-xl">TerangaLink</span>
        </div>
        <div className="text-5xl mb-4">🍽️</div>
        <h1 className="text-2xl font-bold text-white mb-2">Restaurant introuvable</h1>
        <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto">
          Ce restaurant n&apos;existe pas ou n&apos;est pas encore actif sur TerangaLink.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-6 py-3 rounded-xl font-semibold text-sm transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
