import Link from 'next/link'
import { Button } from '@/components/ui/Button'
import { Zap } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="w-8 h-8 bg-brand-orange rounded-lg flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-white text-xl">TerangaLink</span>
        </div>

        <p className="text-brand-orange font-mono text-sm font-bold uppercase tracking-widest mb-3">
          404
        </p>
        <h1 className="text-3xl font-bold text-white mb-3">Page introuvable</h1>
        <p className="text-gray-500 mb-8 max-w-sm mx-auto">
          La page que vous cherchez n&apos;existe pas ou a été déplacée.
        </p>

        <div className="flex gap-3 justify-center">
          <Link href="/">
            <Button variant="outline">Accueil</Button>
          </Link>
          <Link href="/dashboard">
            <Button>Tableau de bord</Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
