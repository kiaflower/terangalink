import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPrincipalAdmin } from '@/lib/auth/boutiqueAdmin'
import { ReceiptDocument } from '@/lib/pdf/ReceiptDocument'
import type { PlanKey } from '@/lib/plans'

export const dynamic = 'force-dynamic'

function formatFcfa(amount: number): string {
  const withSpaces = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces} FCFA`
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()
    const { data: invoice } = await admin
      .from('invoices')
      .select('invoice_number, boutique_id, period_start, period_end, plan, final_amount, status, payment_method, paid_at, boutique:boutiques(name)')
      .eq('id', params.id)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })
    if (invoice.status !== 'paid' || !invoice.paid_at) {
      return NextResponse.json({ error: 'Cette facture n\'a pas encore été payée' }, { status: 400 })
    }

    const principal = await getPrincipalAdmin(admin, invoice.boutique_id)

    const buffer = await renderToBuffer(
      <ReceiptDocument
        invoiceNumber={invoice.invoice_number}
        boutiqueName={(invoice.boutique as unknown as { name: string } | null)?.name ?? '—'}
        contactEmail={principal?.email ?? null}
        plan={invoice.plan as PlanKey}
        periodStart={invoice.period_start}
        periodEnd={invoice.period_end}
        amountPaid={formatFcfa(invoice.final_amount)}
        paymentMethod={invoice.payment_method ?? 'Autre'}
        paidAt={invoice.paid_at}
      />
    )

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Recu-${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('invoices/[id]/receipt error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
