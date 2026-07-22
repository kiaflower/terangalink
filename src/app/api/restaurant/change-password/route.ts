import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { rotateRestaurantPassword } from '@/lib/auth/restaurantAdmin'
import { sendMail } from '@/lib/email/send'
import { passwordChangedEmail } from '@/lib/email/templates'
import { assertEncryptionConfigured } from '@/lib/crypto'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const caller = createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user?.email) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profileData } = await caller
      .from('profiles')
      .select('role, restaurant_id, admin_role, is_active')
      .eq('id', user.id)
      .single()
    const profile = profileData as { role: string; restaurant_id: string | null; admin_role: string | null; is_active: boolean } | null

    if (!profile || profile.role !== 'restaurant_admin' || !profile.is_active || !profile.restaurant_id) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }
    // Contrôle serveur strict : même si l'UI grise le champ pour un admin
    // secondaire, toute requête directe est rejetée ici.
    if (profile.admin_role !== 'principal') {
      return NextResponse.json({ error: 'Seul l\'admin principal peut modifier le mot de passe.' }, { status: 403 })
    }

    const { current, next } = await request.json()
    if (!current || !next) return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    if (typeof next !== 'string' || next.length < 8) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit faire au moins 8 caractères.' }, { status: 400 })
    }

    // Échoue immédiatement si APP_ENCRYPTION_KEY est mal configurée, avant
    // de toucher au vrai mot de passe Supabase de qui que ce soit.
    assertEncryptionConfigured()

    const { error: verifyError } = await caller.auth.signInWithPassword({ email: user.email, password: current })
    if (verifyError) return NextResponse.json({ error: 'Mot de passe actuel incorrect.' }, { status: 400 })

    // Update self-service : contrairement à admin.auth.admin.updateUserById
    // (utilisé pour les autres admins dans rotateRestaurantPassword), un update
    // self-service via le client de la requête ne révoque pas la session en
    // cours — c'est ce qui garantit que le principal reste connecté après
    // avoir changé le mot de passe partagé.
    const { error: selfUpdateError } = await caller.auth.updateUser({ password: next })
    if (selfUpdateError) return NextResponse.json({ error: selfUpdateError.message }, { status: 500 })

    const admin = createAdminClient()
    const { data: restaurantData } = await admin.from('restaurants').select('name').eq('id', profile.restaurant_id).single()
    const restaurantName = (restaurantData as { name: string } | null)?.name ?? 'votre restaurant'

    const { admins } = await rotateRestaurantPassword(admin, profile.restaurant_id, next, user.id)

    const others = admins.filter(a => a.id !== user.id)
    await Promise.all(others.map(a => sendMail({ to: a.email, ...passwordChangedEmail(restaurantName, a.email, next) })))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('change-password error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
