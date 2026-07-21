import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { runInvoiceGenerationSweep } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

// Appelée par Vercel Cron (voir vercel.json). Vercel signe la requête avec
// `Authorization: Bearer ${CRON_SECRET}` — on vérifie ce header pour empêcher
// n'importe qui d'appeler cette route et de déclencher la facturation.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  try {
    const admin = createAdminClient()
    await runInvoiceGenerationSweep(admin)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('cron/generate-invoices error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
