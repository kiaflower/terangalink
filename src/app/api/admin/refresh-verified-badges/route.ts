import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Pas de cron disponible sur ce projet : ce endpoint est appelé ponctuellement
// (ex. au chargement de la liste des restaurants côté super-admin) plutôt
// qu'en tâche de fond réelle. Il applique les critères du badge Vérifié :
// 3 mois d'ancienneté, 100 commandes livrées, note moyenne > 4.5, 50+ avis.
export async function POST() {
  const caller = await createClient()
  const { data: { user } } = await caller.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const admin = createAdminClient()
  const { error } = await admin.rpc('refresh_verified_badges')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
