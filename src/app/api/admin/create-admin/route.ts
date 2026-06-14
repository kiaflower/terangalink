import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'
import { normalizePlan } from '@/lib/plans'

export async function POST(request: NextRequest) {
  try {
    // Verify caller is super_admin
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: callerProfile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { full_name, email, password, restaurant_id, create_restaurant, restaurant_name, plan } = body

    if (!full_name || !email || !password) {
      return NextResponse.json({ error: 'Nom, email et mot de passe requis' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Mot de passe trop court (minimum 8 caractères)' }, { status: 400 })
    }

    const normalizedPlan = normalizePlan(plan || 'starter')
    const admin = createAdminClient()
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

    // ─── Step 1: Create auth user ──────────────────────────────────────────
    const { data: newUser, error: userError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: 'restaurant_admin' },
    })

    if (userError || !newUser.user) {
      return NextResponse.json(
        { error: userError?.message || 'Erreur création compte' },
        { status: 500 }
      )
    }

    const userId = newUser.user.id

    // ─── Step 2: Determine restaurant ─────────────────────────────────────
    let finalRestaurantId = restaurant_id
    let finalRestaurantName = restaurant_name

    if (create_restaurant && restaurant_name) {
      // Créer un nouveau restaurant avec cet admin
      const slug = slugify(restaurant_name)
      const { data: restaurant, error: restaurantError } = await admin
        .from('restaurants')
        .insert({
          name: restaurant_name,
          slug,
          city: 'Dakar',
          owner_id: userId,
          is_active: true,
          is_verified: false,
        })
        .select()
        .single()

      if (restaurantError || !restaurant) {
        await admin.auth.admin.deleteUser(userId)
        return NextResponse.json(
          { error: restaurantError?.message || 'Erreur création restaurant' },
          { status: 500 }
        )
      }

      finalRestaurantId = restaurant.id
      finalRestaurantName = restaurant.name

      // Créer l'abonnement
      await admin.from('subscriptions').insert({
        restaurant_id: restaurant.id,
        plan: normalizedPlan,
        status: 'active',
      })
    } else if (restaurant_id && !create_restaurant) {
      // Admin ajouté à un restaurant existant — récupérer le nom
      const { data: existingRestaurant } = await admin
        .from('restaurants')
        .select('name')
        .eq('id', restaurant_id)
        .single()
      finalRestaurantName = existingRestaurant?.name || 'votre restaurant'
    }

    // ─── Step 3: Update or create profile ─────────────────────────────────
    const { data: existingProfile } = await admin
      .from('profiles').select('id').eq('id', userId).single()

    if (existingProfile) {
      await admin.from('profiles').update({
        full_name,
        role: 'restaurant_admin',
        restaurant_id: finalRestaurantId || null,
      }).eq('id', userId)
    } else {
      await admin.from('profiles').insert({
        id: userId,
        email,
        full_name,
        role: 'restaurant_admin',
        restaurant_id: finalRestaurantId || null,
      })
    }

    // ─── Step 4: Email selon le cas ────────────────────────────────────────
    try {
      if (create_restaurant) {
        // Nouveau restaurant → email de bienvenue avec identifiants + plan
        await fetch(`${baseUrl}/api/admin/send-welcome`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: email,
            restaurant_name: finalRestaurantName,
            admin_name: full_name,
            password,
            plan: normalizedPlan,
          }),
        })
      } else {
        // Admin ajouté à restaurant existant → email invitation admin
        await fetch(`${baseUrl}/api/admin/send-admin-invite`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to_email: email,
            admin_name: full_name,
            restaurant_name: finalRestaurantName,
            password,
          }),
        })
      }
    } catch {
      // L'email ne doit pas bloquer la création du compte
    }

    return NextResponse.json({
      success: true,
      data: { user_id: userId, restaurant_id: finalRestaurantId, email },
    })

  } catch (err) {
    console.error('Create admin error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
