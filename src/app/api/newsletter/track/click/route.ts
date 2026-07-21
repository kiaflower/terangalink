import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verify } from '@/lib/newsletter/token'
import { getSiteUrl } from '@/lib/site-url'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const recipientId = searchParams.get('r')
  const u = searchParams.get('u')
  const token = searchParams.get('t')
  const fallback = getSiteUrl()

  if (!recipientId || !u || !token || !verify(`${recipientId}|${u}`, token)) {
    return NextResponse.redirect(fallback)
  }

  let targetUrl: string
  try {
    targetUrl = Buffer.from(u, 'base64url').toString('utf8')
    const parsed = new URL(targetUrl)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return NextResponse.redirect(fallback)
  } catch {
    return NextResponse.redirect(fallback)
  }

  try {
    const admin = createAdminClient()
    const { data: recipient } = await admin
      .from('newsletter_recipients')
      .select('id, click_count, first_clicked_at')
      .eq('id', recipientId)
      .maybeSingle()

    if (recipient) {
      await admin.from('newsletter_recipients').update({
        status: 'clicked',
        click_count: (recipient.click_count ?? 0) + 1,
        first_clicked_at: recipient.first_clicked_at ?? new Date().toISOString(),
      }).eq('id', recipientId)
    }
  } catch (err) {
    console.error('newsletter/track/click error:', err)
  }

  return NextResponse.redirect(targetUrl)
}
