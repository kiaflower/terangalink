import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { checkBoutiqueSession } from '@/lib/auth/session'

export const dynamic = 'force-dynamic'

/**
 * Poll léger appelé depuis le dashboard boutique (BoutiqueSessionGuard) pour
 * détecter une déconnexion forcée (changement de mdp, suppression d'admin)
 * pendant qu'un admin reste inactif sur une page sans naviguer. Jamais
 * affecté par le mode impersonation du super-admin.
 */
export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, reason: 'unauthenticated' }, { status: 401 })

  const impersonating = cookies().get('sa_impersonate')?.value
  const { data: profileData } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  const role = (profileData as { role?: string } | null)?.role

  if (role === 'super_admin' && impersonating) {
    return NextResponse.json({ ok: true })
  }

  const result = await checkBoutiqueSession(supabase, user.id)
  if (!result.ok) return NextResponse.json({ ok: false, reason: result.reason }, { status: 401 })

  return NextResponse.json({ ok: true })
}
