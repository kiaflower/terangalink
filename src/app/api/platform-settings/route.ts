import { NextResponse } from 'next/server'
import { getPlatformSettings } from '@/lib/platform-settings'

export const dynamic = 'force-dynamic'

// Public, no-auth route: exposes only the public-safe subset of platform
// settings (support contact info, social links, plan prices) for client
// components that can't call the server-only admin client directly.
export async function GET() {
  const settings = await getPlatformSettings()
  return NextResponse.json(settings, { headers: { 'Cache-Control': 'no-store' } })
}
