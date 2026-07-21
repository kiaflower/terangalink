import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { endpoint } = await req.json()
  if (!endpoint) return NextResponse.json({ error: 'endpoint requis' }, { status: 400 })

  const admin = createAdminClient()
  // Le filtre profile_id empêche un utilisateur de supprimer l'abonnement
  // d'un autre admin de la même boutique en devinant son endpoint.
  await admin.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('profile_id', user.id)

  return NextResponse.json({ success: true })
}
