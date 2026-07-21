import { NextRequest, NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getPrincipalAdmin } from '@/lib/auth/boutiqueAdmin'
import { getPlatformSettings } from '@/lib/platform-settings'
import { InvoiceDocument } from '@/lib/pdf/InvoiceDocument'
import type { PlanKey } from '@/lib/plans'

export const dynamic = 'force-dynamic'

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
      .select('invoice_number, boutique_id, period_start, period_end, plan, full_amount, discount_amount, discount_reason, final_amount, status, generated_at, due_at, boutique:boutiques(name)')
      .eq('id', params.id)
      .single()

    if (!invoice) return NextResponse.json({ error: 'Facture introuvable' }, { status: 404 })

    const [principal, platformSettings] = await Promise.all([
      getPrincipalAdmin(admin, invoice.boutique_id),
      getPlatformSettings(),
    ])

    const buffer = await renderToBuffer(
      <InvoiceDocument
        invoiceNumber={invoice.invoice_number}
        boutiqueName={(invoice.boutique as unknown as { name: string } | null)?.name ?? '—'}
        contactEmail={principal?.email ?? null}
        periodStart={invoice.period_start}
        periodEnd={invoice.period_end}
        plan={invoice.plan as PlanKey}
        fullAmount={invoice.full_amount}
        discountAmount={invoice.discount_amount}
        discountReason={invoice.discount_reason}
        finalAmount={invoice.final_amount}
        status={invoice.status}
        generatedAt={invoice.generated_at}
        dueAt={invoice.due_at}
        paymentNumber={platformSettings.subscription_payment_number}
      />
    )

    return new NextResponse(Buffer.from(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${invoice.invoice_number}.pdf"`,
      },
    })
  } catch (err) {
    console.error('invoices/[id]/pdf error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
