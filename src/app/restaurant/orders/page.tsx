import { Card } from '@/components/ui/Card'
import { ShoppingBag } from 'lucide-react'

export const metadata = { title: 'Commandes' }

export default function OrdersPage() {
  return (
    <div className="p-6 sm:p-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Commandes</h1>
        <p className="text-gray-500 text-sm mt-1">Historique et commandes en temps réel</p>
      </div>

      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-brand-orange/10 rounded-2xl flex items-center justify-center mb-4">
            <ShoppingBag className="w-8 h-8 text-brand-orange" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">
            Gestion des commandes — Phase 2
          </h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Recevez et gérez vos commandes en temps réel. Cette fonctionnalité
            sera disponible dans la prochaine version.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 bg-brand-orange/10 border border-brand-orange/20 rounded-full px-4 py-2 text-brand-orange text-xs font-semibold">
            🚀 Bientôt disponible
          </div>
        </div>
      </Card>
    </div>
  )
}
