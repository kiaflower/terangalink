import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { slugify } from '@/lib/utils'

export async function POST(request: NextRequest) {
  try {
    // Verify caller is super_admin
    const callerClient = await createClient()
    const { data: { user: caller } } = await callerClient.auth.getUser()

    if (!caller) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
    }

    const { data: callerProfile } = await callerClient
      .from('profiles')
      .select('role')
      .eq('id', caller.id)
      .single()

    if (callerProfile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    // Parse body
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
      return NextResponse.json(
        { error: 'Champs requis manquants' },
        { status: 400 }
      )
    }

    const adminClient = createAdminClient()

    // ─── Step 1: Create auth user ──────────────────────────────────────────
    const { data: newUser, error: userError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        role: 'restaurant_admin',
      },
    })

    if (userError || !newUser.user) {
      return NextResponse.json(
        { error: userError?.message || 'Erreur création utilisateur' },
        { status: 500 }
      )
    }

    const userId = newUser.user.id

    // ─── Step 2: Create restaurant ─────────────────────────────────────────
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
      // Rollback: delete the auth user
      await adminClient.auth.admin.deleteUser(userId)
      return NextResponse.json(
        { error: restaurantError?.message || 'Erreur création restaurant' },
        { status: 500 }
      )
    }

    // ─── Step 3: Update profile with restaurant_id ─────────────────────────
    // The trigger already created the profile; update it with restaurant_id
    const { error: profileError } = await adminClient
      .from('profiles')
      .update({
        restaurant_id: restaurant.id,
        full_name,
        role: 'restaurant_admin',
      })
      .eq('id', userId)

    if (profileError) {
      // Non-fatal — log but continue
      console.error('Profile update error:', profileError)
    }

    // ─── Step 4: Create subscription ──────────────────────────────────────
    await adminClient.from('subscriptions').insert({
      restaurant_id: restaurant.id,
      plan,
      status: 'trial',
    })

    return NextResponse.json({
      success: true,
      data: {
        user_id: userId,
        restaurant_id: restaurant.id,
        restaurant_name: restaurant.name,
        email,
      },
    })
  } catch (error) {
    console.error('Create restaurant admin error:', error)
    return NextResponse.json(
      { error: 'Erreur serveur interne' },
      { status: 500 }
    )
  }
}
