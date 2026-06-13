import { Card } from '@/components/ui/Card'
import { UtensilsCrossed } from 'lucide-react'

export const metadata = { title: 'Menu' }

export default function MenuPage() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Menu</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez vos plats et catégories</p>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center mb-4">
            <UtensilsCrossed className="w-8 h-8 text-brand-orange" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Gestion du menu — Phase 2
          </h3>
          <p className="text-gray-500 text-sm max-w-sm">
            La gestion des plats, catégories et photos sera disponible dans la
            prochaine version. Votre fondation est prête !
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-brand-orange/10 border border-brand-orange/20 rounded-full px-4 py-2 text-brand-orange text-xs font-semibold">
            🚀 Bientôt disponible
          </div>
        </div>
      </Card>
    </div>
  )
}
