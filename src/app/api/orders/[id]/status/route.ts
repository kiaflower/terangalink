import { createAdminClient } from '@/lib/supabase/admin'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['pending', 'confirmed', 'in_delivery', 'delivered', 'cancelled']

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { status } = await req.json()

  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('orders')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
