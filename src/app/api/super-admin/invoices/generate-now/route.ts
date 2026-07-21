import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInvoiceGenerationSweep } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

// Déclenchement manuel de la génération de factures — utile pour tester sans
// attendre le cron Vercel (qui ne tourne pas en local) ou le filet de
// sécurité throttlé à 6h. Respecte les mêmes règles que le cron (délai de 3
// jours avant échéance, idempotence) : ne force jamais une facture prématurée.
export async function POST() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()
    const generated = await runInvoiceGenerationSweep(admin)

    return NextResponse.json({ success: true, generated })
  } catch (err) {
    console.error('invoices/generate-now error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
