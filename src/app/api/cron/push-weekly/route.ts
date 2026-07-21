import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getBoutiqueNotificationSettings } from '@/lib/push/notificationSettings'
import { computeWeeklyStats } from '@/lib/analytics/weeklyStats'
import { sendPushToBoutique } from '@/lib/push/sendPush'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Cron hebdomadaire (lundi, voir vercel.json) : envoie le rapport de la
 * semaine écoulée en notification push aux boutiques qui l'ont activé.
 * Complète — sans le remplacer — le bouton d'envoi manuel WhatsApp du
 * super admin (src/app/api/super-admin/boutiques/[id]/send-weekly-report).
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const admin = createAdminClient()
  const periodEnd = new Date()
  const periodStart = new Date(periodEnd.getTime() - 7 * 24 * 60 * 60 * 1000)

  const { data: boutiques } = await admin.from('boutiques').select('id, name').eq('is_active', true)

  let sent = 0
  for (const boutique of boutiques ?? []) {
    try {
      const settings = await getBoutiqueNotificationSettings(admin, boutique.id)
      if (!settings.weekly_report_auto_enabled) continue

      const stats = await computeWeeklyStats(admin, boutique.id, periodStart, periodEnd)

      const body = [
        `${stats.visits} visite${stats.visits > 1 ? 's' : ''}, ${stats.ordersTotal} commande${stats.ordersTotal > 1 ? 's' : ''}`,
        stats.abandonedCarts > 0 ? `${stats.abandonedCarts} panier${stats.abandonedCarts > 1 ? 's' : ''} abandonné${stats.abandonedCarts > 1 ? 's' : ''}` : null,
        stats.visitGrowthPercent !== null ? `${stats.visitGrowthPercent >= 0 ? '+' : ''}${stats.visitGrowthPercent}% de visites vs la semaine dernière` : null,
      ].filter(Boolean).join(' · ')

      await admin.from('weekly_reports').insert({
        boutique_id: boutique.id,
        period_start: stats.periodStart,
        period_end: stats.periodEnd,
        status: 'sent',
        stats_snapshot: stats,
        sent_via: 'auto_push',
        sent_at: new Date().toISOString(),
      })

      await sendPushToBoutique(admin, boutique.id, {
        type: 'weekly_report',
        title: 'Votre rapport hebdomadaire est prêt',
        body,
        url: '/dashboard/boutique/analytics',
      })
      sent++
    } catch (err) {
      console.error(`push-weekly error for boutique ${boutique.id}:`, err)
    }
  }

  return NextResponse.json({ success: true, boutiquesProcessed: boutiques?.length ?? 0, sent })
}
