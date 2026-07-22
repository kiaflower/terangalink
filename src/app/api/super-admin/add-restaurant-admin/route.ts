import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { encryptSecret, assertEncryptionConfigured } from '@/lib/crypto'
import { getActiveAdmins, getCurrentPassword } from '@/lib/auth/restaurantAdmin'
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

    const { restaurant_id, full_name, email, password } = await request.json()
    if (!restaurant_id || !email) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })

    // Échoue immédiatement si APP_ENCRYPTION_KEY est mal configurée, avant
    // de créer un vrai compte Supabase Auth.
    assertEncryptionConfigured()

    const admin = createAdminClient()
    const { data: restaurantData } = await admin.from('restaurants').select('name').eq('id', restaurant_id).single()
    if (!restaurantData) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

    const existing = await getActiveAdmins(admin, restaurant_id)
    const isFirstAdmin = existing.length === 0

    // Un admin ajouté à un restaurant qui a déjà un principal doit partager le
    // même mot de passe que les autres — on ignore tout mot de passe fourni
    // par l'appelant dans ce cas pour préserver l'invariant "un seul mdp par
    // restaurant". Seule la création du tout premier admin peut fixer le mdp.
    let finalPassword: string
    if (isFirstAdmin) {
      if (!password || password.length < 8) {
        return NextResponse.json({ error: 'Mot de passe requis (8 caractères min) pour le premier admin de le restaurant.' }, { status: 400 })
      }
      finalPassword = password
    } else {
      if (existing.length >= MAX_ADMINS) {
        return NextResponse.json({ error: 'Limite de 5 administrateurs atteinte' }, { status: 400 })
      }
      const current = await getCurrentPassword(admin, restaurant_id)
      if (!current) {
        return NextResponse.json({ error: 'Aucun mot de passe partagé n\'est encore enregistré pour ce restaurant — demandez au principal de le changer d\'abord.' }, { status: 400 })
      }
      finalPassword = current
    }

    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: { full_name, role: 'restaurant_admin' },
    })

    if (userError || !newUser.user) {
      return NextResponse.json({ error: userError?.message ?? 'Erreur création compte' }, { status: 500 })
    }

    const { error: profileError } = await admin.from('profiles').upsert({
      id: newUser.user.id,
      email,
      full_name: full_name || null,
      role: 'restaurant_admin',
      restaurant_id,
      admin_role: isFirstAdmin ? 'principal' : 'secondaire',
    }, { onConflict: 'id' })

    if (profileError) {
      await admin.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    if (isFirstAdmin) {
      await admin.from('restaurants').update({ password_version: 1, admin_password_enc: encryptSecret(finalPassword) }).eq('id', restaurant_id)
      await sendMail({ to: email, ...welcomeEmail(restaurantData.name, email, finalPassword) })
    } else {
      await sendMail({ to: email, ...adminAddedEmail(restaurantData.name, email, finalPassword) })
    }

    return NextResponse.json({ ok: true, email, password: finalPassword })
  } catch (err) {
    console.error('add-restaurant-admin error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
