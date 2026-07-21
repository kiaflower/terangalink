import type { Metadata, Viewport } from 'next'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { redirect } from 'next/navigation'
import { SuperAdminSidebar } from '@/components/layout/SuperAdminSidebar'
import { runInvoiceGenerationSweepThrottled } from '@/lib/invoices'
import { InstallPwaBanner } from '@/components/dashboard/InstallPwaBanner'
import { RegisterServiceWorker } from '@/components/dashboard/RegisterServiceWorker'

export const metadata: Metadata = {
  manifest: '/manifest-admin.json',
  icons: { apple: '/icons/admin-180.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'TerangaSpot Admin',
  },
  other: { 'mobile-web-app-capable': 'yes' },
}

export const viewport: Viewport = {
  themeColor: '#F97316',
}

export default async function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') redirect('/dashboard/boutique')

  // Filet de sécurité : rattrape la génération de factures si le cron
  // Vercel a été manqué. Throttlé en interne (platform_settings) donc
  // quasi gratuit sur les navigations qui suivent. Attendu explicitement —
  // une promesse "fire and forget" ici risquerait d'être tuée en cours de
  // route par la fonction serverless une fois la réponse envoyée.
  try {
    await runInvoiceGenerationSweepThrottled(createAdminClient())
  } catch (err) {
    console.error('runInvoiceGenerationSweepThrottled error:', err)
  }

  return (
    <SuperAdminSidebar>
      <RegisterServiceWorker />
      <InstallPwaBanner variant="admin" />
      {children}
    </SuperAdminSidebar>
  )
}
