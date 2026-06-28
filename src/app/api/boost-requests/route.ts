import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { restaurant_id, type, duree, prix, date_debut, date_fin, notes_internes } = await req.json()
  if (!restaurant_id || !type || !duree || !prix) {
    return NextResponse.json({ error: 'Paramètres manquants' }, { status: 400 })
  }

  const { data: profile } = await supabase
    .from('profiles').select('restaurant_id').eq('id', user.id).single()
  if (profile?.restaurant_id !== restaurant_id) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
  }

  // Vérifier doublon
  const { data: existing } = await supabase
    .from('boost_requests')
    .select('id')
    .eq('restaurant_id', restaurant_id)
    .in('statut', ['en_attente', 'en_cours'])
    .maybeSingle()

  if (existing) return NextResponse.json({ error: 'DOUBLON' }, { status: 409 })

  const { error } = await supabase.from('boost_requests').insert({
    restaurant_id,
    type,
    duree,
    prix,
    statut: 'en_attente',
    date_debut: date_debut || null,
    date_fin: date_fin || null,
    notes_internes: notes_internes || null,
  } as never)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles').select('restaurant_id').eq('id', user.id).single()
  if (!profile?.restaurant_id) return NextResponse.json({ active: false })

  const { data } = await supabase
    .from('boost_requests')
    .select('id, statut')
    .eq('restaurant_id', profile.restaurant_id)
    .in('statut', ['en_attente', 'en_cours'])
    .maybeSingle()

  return NextResponse.json({ active: !!data, statut: data?.statut ?? null })
}
