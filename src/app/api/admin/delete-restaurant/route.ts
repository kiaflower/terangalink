import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    // Verify super_admin
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { restaurant_id, delete_admins } = await request.json()
    if (!restaurant_id) {
      return NextResponse.json({ error: 'restaurant_id requis' }, { status: 400 })
    }

    const admin = createAdminClient()

    // Optionally delete auth accounts of linked admins
    if (delete_admins) {
      const { data: admins } = await admin
        .from('profiles')
        .select('id')
        .eq('restaurant_id', restaurant_id)
        .eq('role', 'restaurant_admin')

      for (const a of admins ?? []) {
        await admin.auth.admin.deleteUser(a.id)
      }
    } else {
      // Just unlink admins from restaurant
      await admin.from('profiles')
        .update({ restaurant_id: null })
        .eq('restaurant_id', restaurant_id)
    }

    // Delete restaurant — cascade deletes: subscriptions, menu_categories,
    // menu_items, orders, analytics_events (all have ON DELETE CASCADE)
    const { error } = await admin
      .from('restaurants')
      .delete()
      .eq('id', restaurant_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Delete restaurant error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
