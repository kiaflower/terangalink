import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

async function findUserByEmail(adminClient: ReturnType<typeof createAdminClient>, email: string) {
  const target = email.toLowerCase()
  let page = 1

  while (page <= 20) {
    const { data, error } = await adminClient.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) throw error

    const users = data?.users || []
    const found = users.find(u => (u.email || '').toLowerCase() === target)
    if (found) return found

    if (users.length < 1000) break
    page += 1
  }

  return null
}

export async function POST(request: NextRequest) {
  try {
    const callerClient = await createClient()
    const { data: { user: caller } } = await callerClient.auth.getUser()

    if (!caller) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const {
      full_name,
      email,
      password,
      restaurant_name,
      restaurant_city,
      restaurant_phone,
      restaurant_address,
      cuisine_type,
      plan = 'mensuel',
    } = body

    if (!full_name || !email || !password || !restaurant_name) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    let userId: string | null = null
    let createdUserId: string | null = null

    const existing = await findUserByEmail(adminClient, String(email))

    if (existing) {
      userId = existing.id
    } else {
      const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name, role: 'restaurant_admin' },
      })

      if (userError || !newUser.user) {
        return NextResponse.json({ error: userError?.message || 'Erreur création utilisateur' }, { status: 500 })
      }

      userId = newUser.user.id
      createdUserId = newUser.user.id
    }

    const slug = slugify(restaurant_name)
    const { data: restaurant, error: restaurantError } = await adminClient
      .from('restaurants')
      .insert({
        name: restaurant_name,
        slug,
        city: restaurant_city || 'Dakar',
        phone: restaurant_phone || null,
        address: restaurant_address || null,
        cuisine_type: cuisine_type || null,
        owner_id: userId,
        is_active: true,
        is_verified: false,
      })
      .select()
      .single()

    if (restaurantError || !restaurant) {
      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(createdUserId)
      }
      return NextResponse.json({ error: restaurantError?.message || 'Erreur création restaurant' }, { status: 500 })
    }

    const { error: profileUpsertError } = await adminClient
      .from('profiles')
      .upsert({
        id: userId,
        email,
        full_name,
        role: 'restaurant_admin',
        restaurant_id: restaurant.id,
        updated_at: new Date().toISOString(),
      })

    if (profileUpsertError) {
      await adminClient.from('restaurants').delete().eq('id', restaurant.id)
      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(createdUserId)
      }
      console.error('Profile upsert error:', profileUpsertError)
      return NextResponse.json({ error: 'Restaurant créé mais liaison admin incomplète' }, { status: 500 })
    }

    const { error: subError } = await adminClient.from('subscriptions').insert({
      restaurant_id: restaurant.id,
      plan,
      status: 'trial',
    })

    if (subError) {
      await adminClient.from('restaurants').delete().eq('id', restaurant.id)
      if (createdUserId) {
        await adminClient.auth.admin.deleteUser(createdUserId)
      }
      return NextResponse.json({ error: subError.message || 'Erreur création abonnement' }, { status: 500 })
    }

    // ✅ Envoi email de bienvenue
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: email,
          restaurant_name: restaurant.name,
          admin_name: full_name,
          password,
          plan,
        }),
      })
      console.log(`[WELCOME EMAIL] ✅ Déclenché pour ${email}`)
    } catch (emailError) {
      // L'email a échoué mais le restaurant est créé — on log sans bloquer
      console.error('[WELCOME EMAIL] ❌ Non envoyé:', emailError)
    }

    return NextResponse.json({
      success: true,
      data: { user_id: userId, restaurant_id: restaurant.id, restaurant_name: restaurant.name, email },
    })
  } catch (error) {
    console.error('Create restaurant admin error:', error)
    return NextResponse.json({ error: 'Erreur serveur interne' }, { status: 500 })
  }
}