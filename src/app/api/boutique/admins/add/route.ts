import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveAdmins, getCurrentPassword } from '@/lib/auth/boutiqueAdmin'
import { sendMail } from '@/lib/email/send'
import { adminAddedEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'
const MAX_ADMINS = 5

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profileData } = await caller
      .from('profiles')
      .select('role, boutique_id, admin_role, is_active')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string; boutique_id: string | null; admin_role: string | null; is_active: boolean } | null

    if (!profile || profile.role !== 'boutique_admin' || !profile.is_active || !profile.boutique_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    if (profile.admin_role !== 'principal') {
      return NextResponse.json({ error: 'Seul l\'admin principal peut ajouter un administrateur.' }, { status: 403 })
    }

    const { full_name, email } = await request.json()
    if (!full_name || !email) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    const admin = createAdminClient()
    const boutiqueId = profile.boutique_id

    const { data: subData } = await admin.from('subscriptions').select('plan').eq('boutique_id', boutiqueId).single()
    if ((subData as { plan?: string } | null)?.plan !== 'pro') {
      return NextResponse.json({ error: 'La gestion des admins est réservée au plan Pro.' }, { status: 403 })
    }

    const existing = await getActiveAdmins(admin, boutiqueId)
    if (existing.length >= MAX_ADMINS) {
      return NextResponse.json({ error: 'Limite de 5 administrateurs atteinte' }, { status: 400 })
    }

    const currentPassword = await getCurrentPassword(admin, boutiqueId)
    if (!currentPassword) {
      return NextResponse.json({ error: 'Aucun mot de passe partagé n\'est encore enregistré — changez d\'abord le mot de passe.' }, { status: 400 })
    }

    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password: currentPassword,
      email_confirm: true,
      user_metadata: { full_name, role: 'boutique_admin' },
    })
    if (userError || !newUser.user) {
      return NextResponse.json({ error: userError?.message ?? 'Erreur création compte' }, { status: 500 })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: newUser.user.id,
      email,
      full_name,
      role: 'boutique_admin',
      boutique_id: boutiqueId,
      admin_role: 'secondaire',
      is_active: true,
    }, { onConflict: 'id' })

    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    const { data: boutiqueData } = await admin.from('boutiques').select('name').eq('id', boutiqueId).single()
    const boutiqueName = (boutiqueData as { name: string } | null)?.name ?? 'votre boutique'
    await sendMail({ to: email, ...adminAddedEmail(boutiqueName, email, currentPassword) })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('boutique admins/add error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
