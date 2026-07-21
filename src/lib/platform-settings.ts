import { createAdminClient } from '@/lib/supabase/admin'
import { PLANS } from '@/lib/plans'

export interface PlatformSettings {
  platform_url: string
  support_phone: string
  support_whatsapp: string
  support_email: string
  instagram_url: string
  facebook_url: string
  tiktok_url: string
  plan_starter_price: number
  plan_pro_price: number
  maintenance_mode: boolean
  maintenance_message: string
  subscription_payment_number: string
}

export const DEFAULT_PLATFORM_SETTINGS: PlatformSettings = {
  platform_url: 'https://terangaspot.com',
  support_phone: '221774739266',
  support_whatsapp: '221774739266',
  support_email: 'support@teranga-spot.com',
  instagram_url: 'https://instagram.com/terangaspot',
  facebook_url: 'https://facebook.com/terangaspot',
  tiktok_url: 'https://tiktok.com/@terangaspot',
  plan_starter_price: PLANS.starter.price,
  plan_pro_price: PLANS.pro.price,
  maintenance_mode: false,
  maintenance_message: '',
  subscription_payment_number: '774739266',
}

// Server-only: reads platform_settings via the admin client (bypasses RLS —
// safe, none of these values are sensitive) and merges in sane defaults.
// Pass an existing admin client to reuse it instead of creating a new one.
export async function getPlatformSettings(client?: ReturnType<typeof createAdminClient>): Promise<PlatformSettings> {
  try {
    const admin = client ?? createAdminClient()
    const { data } = await admin.from('platform_settings').select('key, value')
    const map: Record<string, string> = {}
    for (const row of data ?? []) map[row.key] = row.value

    return {
      platform_url: map.platform_url || DEFAULT_PLATFORM_SETTINGS.platform_url,
      support_phone: map.support_phone || DEFAULT_PLATFORM_SETTINGS.support_phone,
      support_whatsapp: map.support_whatsapp || DEFAULT_PLATFORM_SETTINGS.support_whatsapp,
      support_email: map.support_email || DEFAULT_PLATFORM_SETTINGS.support_email,
      instagram_url: map.instagram_url || DEFAULT_PLATFORM_SETTINGS.instagram_url,
      facebook_url: map.facebook_url || DEFAULT_PLATFORM_SETTINGS.facebook_url,
      tiktok_url: map.tiktok_url || DEFAULT_PLATFORM_SETTINGS.tiktok_url,
      plan_starter_price: Number(map.plan_starter_price) || DEFAULT_PLATFORM_SETTINGS.plan_starter_price,
      plan_pro_price: Number(map.plan_pro_price) || DEFAULT_PLATFORM_SETTINGS.plan_pro_price,
      maintenance_mode: map.maintenance_mode === 'true',
      maintenance_message: map.maintenance_message || DEFAULT_PLATFORM_SETTINGS.maintenance_message,
      subscription_payment_number: map.subscription_payment_number || DEFAULT_PLATFORM_SETTINGS.subscription_payment_number,
    }
  } catch (err) {
    console.error('getPlatformSettings error:', err)
    return DEFAULT_PLATFORM_SETTINGS
  }
}

export async function getPlanPrices(client?: ReturnType<typeof createAdminClient>): Promise<{ starter: number; pro: number }> {
  const settings = await getPlatformSettings(client)
  return { starter: settings.plan_starter_price, pro: settings.plan_pro_price }
}
