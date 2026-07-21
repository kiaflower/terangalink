import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { collectPayment } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

const PAYMENT_METHODS = ['Wave', 'Orange Money', 'Cash', 'Autre']

// Le seul point d'entrée pour enregistrer un paiement. Le montant n'est
// jamais saisi à la main : il est toujours recalculé côté serveur (plan +
// réduction applicable). apply_credit permet au super-admin de choisir une
// réduction au moment de l'encaissement si la boutique n'en a pas déjà
// prévu une elle-même depuis son propre dashboard.
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { boutique_id, method, apply_credit } = await request.json()
    if (!boutique_id) return NextResponse.json({ error: 'boutique_id requis' }, { status: 400 })

    const paymentMethod = PAYMENT_METHODS.includes(method) ? method : 'Autre'
    const applyCredit = apply_credit === 'discount' || apply_credit === 'free_month' ? apply_credit : null

    const admin = createAdminClient()
    const result = await collectPayment(admin, { boutiqueId: boutique_id, method: paymentMethod, applyCredit })
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 })

    return NextResponse.json({ success: true, invoiceId: result.invoiceId, finalAmount: result.finalAmount })
  } catch (err) {
    console.error('invoices/collect-payment error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
