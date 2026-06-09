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

    if (create_restaurant && restaurant_name) {
      // Create new restaurant alongside this admin
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

      // Create subscription
      await admin.from('subscriptions').insert({
        restaurant_id: restaurant.id,
        plan: normalizedPlan,
        status: 'active',
      })
    }

    // ─── Step 3: Update or create profile ─────────────────────────────────
    // Check if trigger already created profile
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

    // Fire welcome email (non-blocking — don't fail if email fails)
    try {
      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
      await fetch(`${baseUrl}/api/admin/send-welcome`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to_email: email,
          restaurant_name: create_restaurant ? restaurant_name : 'votre restaurant',
          admin_name: full_name,
          password,
          plan: normalizedPlan,
        }),
      })
    } catch { /* email failure should not block account creation */ }

    return NextResponse.json({
      success: true,
      data: { user_id: userId, restaurant_id: finalRestaurantId, email },
    })
  } catch (err) {
    console.error('Create admin error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
