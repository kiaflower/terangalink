import { Card } from '@/components/ui/Card'
import { Settings } from 'lucide-react'

export const metadata = { title: 'Paramètres — Super Admin' }

export default function SuperAdminSettingsPage() {
  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Configuration globale de la plateforme</p>
      </div>
      <Card>
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 bg-surface-200 rounded-2xl flex items-center justify-center mb-4">
            <Settings className="w-8 h-8 text-gray-500" />
          </div>
          <h3 className="text-white font-semibold text-lg mb-2">Phase 2</h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Paramètres globaux, configuration email, webhooks — bientôt disponible.
          </p>
        </div>
      </Card>
    </div>
  )
}
