import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, assertEncryptionConfigured } from '@/lib/crypto'
import { getActiveAdmins, getCurrentPassword } from '@/lib/auth/boutiqueAdmin'
import { sendMail } from '@/lib/email/send'
import { welcomeEmail, adminAddedEmail } from '@/lib/email/templates'

export const dynamic = 'force-dynamic'
const MAX_ADMINS = 5

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await caller.from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { boutique_id, full_name, email, password } = await request.json()
    if (!boutique_id || !email) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    // Échoue immédiatement si APP_ENCRYPTION_KEY est mal configurée, avant
    // de créer un vrai compte Supabase Auth.
    assertEncryptionConfigured()

    const admin = createAdminClient()
    const { data: boutiqueData } = await admin.from('boutiques').select('name').eq('id', boutique_id).single()
    if (!boutiqueData) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })

    const existing = await getActiveAdmins(admin, boutique_id)
    const isFirstAdmin = existing.length === 0

    // Un admin ajouté à une boutique qui a déjà un principal doit partager le
    // même mot de passe que les autres — on ignore tout mot de passe fourni
    // par l'appelant dans ce cas pour préserver l'invariant "un seul mdp par
    // boutique". Seule la création du tout premier admin peut fixer le mdp.
    let finalPassword: string
    if (isFirstAdmin) {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Mot de passe requis (8 caractères min) pour le premier admin de la boutique.' }, { status: 400 })
      }
      finalPassword = password
    } else {
      if (existing.length >= MAX_ADMINS) {
        return NextResponse.json({ error: 'Limite de 5 administrateurs atteinte' }, { status: 400 })
      }
      const current = await getCurrentPassword(admin, boutique_id)
      if (!current) {
        return NextResponse.json({ error: 'Aucun mot de passe partagé n\'est encore enregistré pour cette boutique — demandez au principal de le changer d\'abord.' }, { status: 400 })
      }
      finalPassword = current
    }

    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name, role: 'boutique_admin' },
    })

    if (userError || !newUser.user) {
      return NextResponse.json({ error: userError?.message ?? 'Erreur création compte' }, { status: 500 })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: newUser.user.id,
      email,
      full_name: full_name || null,
      role: 'boutique_admin',
      boutique_id,
      admin_role: isFirstAdmin ? 'principal' : 'secondaire',
    }, { onConflict: 'id' })

    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (isFirstAdmin) {
      await admin.from('boutiques').update({ password_version: 1, admin_password_enc: encryptSecret(finalPassword) }).eq('id', boutique_id)
      await sendMail({ to: email, ...welcomeEmail(boutiqueData.name, email, finalPassword) })
    } else {
      await sendMail({ to: email, ...adminAddedEmail(boutiqueData.name, email, finalPassword) })
    }

    return NextResponse.json({ ok: true, email, password: finalPassword })
  } catch (err) {
    console.error('add-boutique-admin error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
