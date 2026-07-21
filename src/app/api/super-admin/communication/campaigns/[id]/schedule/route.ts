import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prepareCampaignForSending } from '@/lib/newsletter/send'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const body = await request.json().catch(() => ({}))
    const scheduledAt = typeof body.scheduled_at === 'string' ? new Date(body.scheduled_at) : null
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime()) || scheduledAt.getTime() <= Date.now()) {
      return NextResponse.json({ error: 'Date de programmation invalide (doit être dans le futur)' }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await prepareCampaignForSending(admin, params.id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

    await admin.from('newsletter_campaigns').update({
      status: 'scheduled',
      scheduled_at: scheduledAt.toISOString(),
    }).eq('id', params.id)

    return NextResponse.json({ success: true, recipientCount: result.recipientCount })
  } catch (err) {
    console.error('communication/campaigns/[id]/schedule error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
