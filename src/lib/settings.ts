import { createClient } from '@/lib/supabase/server'

export interface PlatformSettings {
  whatsapp: string
  email: string
  city: string
  platform_name: string
  platform_url: string
}

const DEFAULTS: PlatformSettings = {
  whatsapp: '221700000000',
  email: 'support@terangalink.sn',
  city: 'Dakar, Sénégal',
  platform_name: 'TerangaLink',
  platform_url: 'https://terangalink.sn',
}

export async function getPlatformSettings(): Promise<PlatformSettings> {
  try {
    const supabase = await createClient()
    const { data } = await supabase
      .from('platform_settings')
      .select('key, value')

    if (!data || data.length === 0) return DEFAULTS

    const settings: Record<string, string> = {}
    for (const row of data) {
      settings[row.key] = row.value
    }

    return {
      whatsapp: settings.whatsapp || DEFAULTS.whatsapp,
      email: settings.email || DEFAULTS.email,
      city: settings.city || DEFAULTS.city,
      platform_name: settings.platform_name || DEFAULTS.platform_name,
      platform_url: settings.platform_url || DEFAULTS.platform_url,
    }
  } catch {
    // Table doesn't exist yet — return defaults
    return DEFAULTS
  }
}
