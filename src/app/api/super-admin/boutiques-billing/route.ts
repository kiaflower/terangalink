import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBoutiqueBillingRows } from '@/lib/invoices'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const admin = createAdminClient()
    const rows = await getBoutiqueBillingRows(admin)
    return NextResponse.json({ rows })
  } catch (err) {
    console.error('boutiques-billing error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
