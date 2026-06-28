import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('restaurant_id').eq('id', user.id).single()
  const restaurantId = (profile as { restaurant_id?: string } | null)?.restaurant_id
  if (!restaurantId) return NextResponse.json({ state: {} })

  const admin = createAdminClient()
  const { data } = await admin
    .from('restaurants')
    .select('smart_card_state')
    .eq('id', restaurantId)
    .single()

  return NextResponse.json({ state: (data as { smart_card_state?: unknown } | null)?.smart_card_state ?? {} })
}

export async function PATCH(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('restaurant_id').eq('id', user.id).single()
  const restaurantId = (profile as { restaurant_id?: string } | null)?.restaurant_id
  if (!restaurantId) return NextResponse.json({ error: 'Restaurant introuvable' }, { status: 404 })

  const body = await req.json()
  const admin = createAdminClient()

  // Merge patch: get current state then merge
  const { data: current } = await admin
    .from('restaurants')
    .select('smart_card_state')
    .eq('id', restaurantId)
    .single()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const currentState: any = (current as { smart_card_state?: unknown } | null)?.smart_card_state ?? {}
  const newState = { ...currentState, ...body }

  // Deep merge for nested objects (card_last_shown, milestones_shown)
  if (body.card_last_shown) {
    newState.card_last_shown = { ...(currentState.card_last_shown ?? {}), ...body.card_last_shown }
  }
  if (body.milestones_shown && Array.isArray(body.milestones_shown)) {
    const existing = Array.isArray(currentState.milestones_shown) ? currentState.milestones_shown : []
    newState.milestones_shown = Array.from(new Set([...existing, ...body.milestones_shown]))
  }
  if (body.onboarding_steps_done && Array.isArray(body.onboarding_steps_done)) {
    const existing = Array.isArray(currentState.onboarding_steps_done) ? currentState.onboarding_steps_done : []
    newState.onboarding_steps_done = Array.from(new Set([...existing, ...body.onboarding_steps_done]))
  }

  const { error } = await admin
    .from('restaurants')
    .update({ smart_card_state: newState } as never)
    .eq('id', restaurantId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, state: newState })
}
