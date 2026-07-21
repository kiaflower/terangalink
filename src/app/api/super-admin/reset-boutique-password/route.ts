import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { generatePassword, rotateBoutiquePassword, getPrincipalAdmin } from '@/lib/auth/boutiqueAdmin'
import { sendMail } from '@/lib/email/send'
import { supportResetEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: callerProfile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { boutique_id } = await request.json()
    if (!boutique_id) return NextResponse.json({ error: 'boutique_id requis' }, { status: 400 })

    const admin = createAdminClient()
    const { data: boutiqueData } = await admin.from('boutiques').select('name').eq('id', boutique_id).single()
    if (!boutiqueData) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

    const newPassword = generatePassword()
    // actingUserId: null — le super-admin n'a pas de session boutique à préserver,
    // et son impersonation ne dépend jamais de password_version.
    await rotateBoutiquePassword(admin, boutique_id, newPassword, null)

    const principal = await getPrincipalAdmin(admin, boutique_id)
    if (principal) {
      await sendMail({ to: principal.email, ...supportResetEmail(boutiqueData.name, principal.email, newPassword) })
    }

    return NextResponse.json({ ok: true, sent_to: principal?.email ?? null })
  } catch (err) {
    console.error('reset-boutique-password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
