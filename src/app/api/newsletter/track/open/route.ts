import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { verify } from '@/lib/newsletter/token'

export const dynamic = 'force-dynamic'

// GIF transparent 1x1 — servi que le token soit valide ou non, pour ne jamais
// révéler à un client email si le tracking a été accepté.
const PIXEL = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64')

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const recipientId = searchParams.get('r')
  const token = searchParams.get('t')

  if (recipientId && token && verify(recipientId, token)) {
    try {
      const admin = createAdminClient()
      const { data: recipient } = await admin
        .from('newsletter_recipients')
        .select('id, status, opened_at')
        .eq('id', recipientId)
        .maybeSingle()

      if (recipient && !recipient.opened_at) {
        await admin.from('newsletter_recipients').update({
          opened_at: new Date().toISOString(),
          status: recipient.status === 'sent' ? 'opened' : recipient.status,
        }).eq('id', recipientId)
      }
    } catch (err) {
      console.error('newsletter/track/open error:', err)
    }
  }

  return new NextResponse(PIXEL, {
    headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store, no-cache, must-revalidate' },
  })
}
