import { createAdminClient } from '@/lib/supabase/admin'
import { Wrench } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function MaintenancePage() {
  const admin = createAdminClient()
  const { data } = await admin.from('platform_settings').select('key, value').in('key', ['maintenance_message', 'support_whatsapp'])
  const settings = Object.fromEntries((data ?? []).map(s => [s.key, s.value]))
  const message = settings.maintenance_message || 'TerangaSpot est actuellement en maintenance. Nous serons de retour très bientôt.'
  const whatsapp = settings.support_whatsapp

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center mb-6">
        <Wrench className="w-8 h-8 text-brand-orange" />
      </div>
      <h1 className="text-2xl font-bold text-gray-900 mb-3">TerangaSpot en maintenance</h1>
      <p className="text-gray-500 max-w-md">{message}</p>
      {whatsapp && (
        <a
          href={`https://wa.me/${whatsapp.replace(/\D/g, '')}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex items-center gap-2 text-sm font-semibold px-5 py-3 rounded-xl text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#F97316' }}
        >
          Nous contacter sur WhatsApp
        </a>
      )}
    </div>
  )
}
