import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

export const metadata = { title: 'Créer un restaurant' }

export default function CreateRestaurantPage() {
  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Créer un restaurant</h1>
        <p className="text-gray-500 text-sm mt-1">
          Pour créer un restaurant, utilisez le formulaire &quot;Créer admin&quot; qui crée
          en même temps le restaurant et son administrateur.
        </p>
      </div>

      <div className="form-card flex flex-col items-start gap-4">
        <p className="text-gray-500 text-sm">
          Le flux recommandé est de créer le compte administrateur et le restaurant
          simultanément pour garantir que le restaurant soit correctement lié à son admin.
        </p>
        <Link
          href="/dashboard/super-admin/create-admin"
          className="inline-flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
        >
          Créer admin + restaurant
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  )
}
