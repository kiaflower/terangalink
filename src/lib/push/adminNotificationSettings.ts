import type { SupabaseClient } from '@supabase/supabase-js'

export interface AdminNotificationSettings {
  new_signup_enabled: boolean
  no_new_product_enabled: boolean
  no_new_product_days: number
  no_product_ever_days: number
  inactive_restaurant_enabled: boolean
  inactive_restaurant_days: number
  overdue_invoice_enabled: boolean
  product_limit_enabled: boolean
  product_limit_percent: number
  periodic_reminder_enabled: boolean
}

const DEFAULTS: AdminNotificationSettings = {
  new_signup_enabled: true,
  no_new_product_enabled: true,
  no_new_product_days: 14,
  no_product_ever_days: 7,
  inactive_restaurant_enabled: true,
  inactive_restaurant_days: 30,
  overdue_invoice_enabled: true,
  product_limit_enabled: true,
  product_limit_percent: 80,
  periodic_reminder_enabled: true,
}

const NUMERIC_KEYS = new Set(['no_new_product_days', 'no_product_ever_days', 'inactive_restaurant_days', 'product_limit_percent'])

// Réutilise platform_settings (clé/valeur déjà utilisé pour le mode
// maintenance et la config générale) plutôt qu'une nouvelle table — un seul
// super admin, pas besoin d'un réglage par utilisateur. Clés préfixées
// `admin_notif_` pour rester repérables au milieu des autres réglages.
export async function getAdminNotificationSettings(admin: SupabaseClient): Promise<AdminNotificationSettings> {
  const { data } = await admin.from('platform_settings').select('key, value').like('key', 'admin_notif_%')

  const result: Record<string, number | boolean> = { ...DEFAULTS }
  for (const row of data ?? []) {
    const shortKey = row.key.replace(/^admin_notif_/, '')
    if (!(shortKey in DEFAULTS)) continue
    if (NUMERIC_KEYS.has(shortKey)) {
      const n = Number(row.value)
      if (Number.isFinite(n) && n > 0) result[shortKey] = n
    } else {
      result[shortKey] = row.value === 'true'
    }
  }
  return result as unknown as AdminNotificationSettings
}
