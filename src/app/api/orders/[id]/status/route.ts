import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const VALID_STATUSES = ['pending', 'confirmed', 'in_delivery', 'delivered', 'cancelled']

// Sécurité (7 octobre 2026) : seul le restaurant de la commande ou le
// super-admin peut changer son statut. Avant, n'importe qui pouvait le faire.
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { status } = await req.json().catch(() => ({}))
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  }

  const admin = createAdminClient()
  const [{ data: profile }, { data: existing }] = await Promise.all([
    admin.from('profiles').select('role, restaurant_id').eq('id', user.id).maybeSingle(),
    admin.from('orders').select('restaurant_id').eq('id', params.id).maybeSingle(),
  ])
  if (!existing) return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  const isSuperAdmin = profile?.role === 'super_admin'
  if (!isSuperAdmin && (!profile?.restaurant_id || profile.restaurant_id !== existing.restaurant_id)) {
    return NextResponse.json({ error: 'Commande introuvable' }, { status: 404 })
  }

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
