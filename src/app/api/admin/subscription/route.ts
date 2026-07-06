import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: NextRequest) {
  try {
    const caller = await createClient()
    const { data: { user } } = await caller.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const { data: profile } = await caller
      .from('profiles').select('role').eq('id', user.id).single()
    if (profile?.role !== 'super_admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const body = await request.json()
    const { action, restaurant_id, amount_paid, payment_date, notes_admin, next_payment_due_date } = body

    if (!action || !restaurant_id) {
      return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
    }

    const admin = createAdminClient()

    if (action === 'mark_paid') {
      const paymentDate = payment_date ? new Date(payment_date) : new Date()
      const nextDue = next_payment_due_date
        ? new Date(next_payment_due_date)
        : new Date(paymentDate.getTime() + 30 * 24 * 60 * 60 * 1000)

      const { error } = await admin
        .from('subscriptions')
        .update({
          status: 'active',
          last_payment_date: paymentDate.toISOString(),
          next_payment_due_date: nextDue.toISOString(),
          amount_paid: amount_paid || 0,
          notes_admin: notes_admin || null,
          subscription_start_date: paymentDate.toISOString(),
        })
        .eq('restaurant_id', restaurant_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'suspend') {
      const { error } = await admin
        .from('subscriptions')
        .update({ status: 'suspended', notes_admin: notes_admin || null })
        .eq('restaurant_id', restaurant_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Désactiver le restaurant
      await admin.from('restaurants').update({ is_active: false }).eq('id', restaurant_id)
      return NextResponse.json({ success: true })
    }

    if (action === 'reactivate') {
      const { error } = await admin
        .from('subscriptions')
        .update({ status: 'active', notes_admin: notes_admin || null })
        .eq('restaurant_id', restaurant_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      // Réactiver le restaurant
      await admin.from('restaurants').update({ is_active: true }).eq('id', restaurant_id)
      return NextResponse.json({ success: true })
    }

    if (action === 'update_due_date') {
      if (!next_payment_due_date) {
        return NextResponse.json({ error: 'Date requise' }, { status: 400 })
      }
      const { error } = await admin
        .from('subscriptions')
        .update({
          next_payment_due_date: new Date(next_payment_due_date).toISOString(),
          notes_admin: notes_admin || null,
        })
        .eq('restaurant_id', restaurant_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'update_dates') {
      const updates: Record<string, string | number | null> = {}
      if (body.trial_start_date !== undefined) updates.trial_start_date = body.trial_start_date ? new Date(body.trial_start_date).toISOString() : null
      if (body.trial_end_date !== undefined) updates.trial_end_date = body.trial_end_date ? new Date(body.trial_end_date).toISOString() : null
      if (body.subscription_start_date !== undefined) updates.subscription_start_date = body.subscription_start_date ? new Date(body.subscription_start_date).toISOString() : null
      if (body.last_payment_date !== undefined) updates.last_payment_date = body.last_payment_date ? new Date(body.last_payment_date).toISOString() : null
      if (body.next_payment_due_date !== undefined) updates.next_payment_due_date = body.next_payment_due_date ? new Date(body.next_payment_due_date).toISOString() : null
      if (body.amount_paid !== undefined) updates.amount_paid = body.amount_paid !== '' ? Number(body.amount_paid) : null
      if (body.legacy_price !== undefined) updates.legacy_price = body.legacy_price !== '' ? Number(body.legacy_price) : null

      if (Object.keys(updates).length === 0) {
        return NextResponse.json({ error: 'Aucune donnée à mettre à jour' }, { status: 400 })
      }

      const { error } = await admin
        .from('subscriptions')
        .update(updates)
        .eq('restaurant_id', restaurant_id)

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    if (action === 'check_trial_expiry') {
      // Passer en overdue tous les essais expirés
      const { error } = await admin
        .from('subscriptions')
        .update({ status: 'overdue' })
        .eq('status', 'trial')
        .lt('trial_end_date', new Date().toISOString())

      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Action inconnue' }, { status: 400 })

  } catch (err) {
    console.error('Subscription action error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
