import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { prepareCampaignForSending, sendCampaignBatch } from '@/lib/newsletter/send'
import { BATCH_SIZE } from '@/lib/newsletter/config'

export const dynamic = 'force-dynamic'
// Laisse de la marge pour envoyer plusieurs lots dans la même requête (jusqu'à la limite du plan Vercel).
export const maxDuration = 60

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }) }
  return { error: null }
}

const TIME_BUDGET_MS = 50_000

// Envoie immédiatement, lot par lot, dans la limite du temps disponible pour
// cette requête. Si la liste est trop grande pour tenir dans une seule
// invocation, la campagne reste en statut "sending" et /api/cron/process-newsletter-queue
// termine le travail au(x) prochain(s) déclenchement(s).
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const result = await prepareCampaignForSending(admin, params.id)
    if ('error' in result) return NextResponse.json({ error: result.error }, { status: 400 })

    await admin.from('newsletter_campaigns').update({ status: 'sending' }).eq('id', params.id)

    const startedAt = Date.now()
    let processed = 0
    let done = false
    while (Date.now() - startedAt < TIME_BUDGET_MS) {
      const batch = await sendCampaignBatch(admin, params.id, BATCH_SIZE)
      processed += batch.processed
      done = batch.done
      if (done || batch.processed === 0) break
    }

    return NextResponse.json({ success: true, processed, done, recipientCount: result.recipientCount })
  } catch (err) {
    console.error('communication/campaigns/[id]/send-now error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
