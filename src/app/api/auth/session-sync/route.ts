import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

/**
 * À appeler juste après un login client réussi (supabase.auth.signInWithPassword).
 * Pour un restaurant_admin : refuse si le compte a été désactivé (suppression
 * d'un admin secondaire), sinon estampille session_password_version sur la
 * version courante du restaurant — c'est ce qui permet à CE login de passer
 * les contrôles de session à venir, même si le mot de passe partagé a changé
 * entre-temps (justement puisque le login n'a pu réussir qu'avec le mot de
 * passe à jour).
 */
export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, restaurant_id, is_active')
    .eq('id', user.id)
    .single()

  const profile = profileData as { role: string; restaurant_id: string | null; is_active: boolean } | null
  if (!profile) return NextResponse.json({ error: 'Profil introuvable' }, { status: 401 })

  if (profile.role !== 'restaurant_admin') {
    return NextResponse.json({ ok: true })
  }

  if (!profile.is_active) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 403 })
  }

  if (!profile.restaurant_id) {
    return NextResponse.json({ error: 'Identifiants incorrects' }, { status: 403 })
  }

  const admin = createAdminClient()
  const { data: restaurantData } = await admin
    .from('restaurants')
    .select('password_version')
    .eq('id', profile.restaurant_id)
    .single()

  const version = (restaurantData as { password_version: number } | null)?.password_version ?? 1
  await admin.from('profiles').update({ session_password_version: version }).eq('id', user.id)

  return NextResponse.json({ ok: true })
}
