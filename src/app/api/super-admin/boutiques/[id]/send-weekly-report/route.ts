import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { computeWeeklyStats } from '@/lib/analytics/weeklyStats'
import { computeRecommendations } from '@/lib/analytics/recommendations'
import { buildWeeklyReportMessage } from '@/lib/analytics/weeklyReportMessage'

export const dynamic = 'force-dynamic'

async function requireSuperAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }), userId: null }
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'super_admin') return { error: NextResponse.json({ error: 'Accès refusé' }, { status: 403 }), userId: null }
  return { error: null, userId: user.id }
}

/**
 * Prépare le rapport hebdomadaire d'une boutique (parcours d'achat, abandon
 * de panier, recommandations) sous forme de message WhatsApp prérempli — l'envoi reste
 * manuel, effectué par le super admin depuis WhatsApp Web/app (même pattern
 * que les commandes : le lien wa.me est ouvert côté client).
 */
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { error: authError, userId } = await requireSuperAdmin()
    if (authError) return authError

    const admin = createAdminClient()
    const boutiqueId = params.id

    const { data: boutique } = await admin.from('boutiques').select('id, name, whatsapp_number').eq('id', boutiqueId).single()
    if (!boutique) return NextResponse.json({ error: 'Boutique introuvable' }, { status: 404 })
    if (!boutique.whatsapp_number) return NextResponse.json({ error: 'Aucun numéro WhatsApp enregistré pour cette boutique' }, { status: 400 })

    const periodEnd = new Date()
    const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

    const stats = await computeWeeklyStats(admin, boutiqueId, periodStart, periodEnd)
    const recommendations = computeRecommendations(stats)
    const message = buildWeeklyReportMessage(boutique.name, stats, recommendations.map(r => r.message))

    const { error: insertError } = await admin.from('weekly_reports').insert({
      boutique_id: boutiqueId,
      period_start: stats.periodStart,
      period_end: stats.periodEnd,
      status: 'sent',
      stats_snapshot: stats,
      sent_by: userId,
      sent_at: new Date().toISOString(),
    })
    if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

    return NextResponse.json({
      success: true,
      sentAt: new Date().toISOString(),
      message,
      whatsappNumber: boutique.whatsapp_number,
    })
  } catch (err) {
    console.error('send-weekly-report error:', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
