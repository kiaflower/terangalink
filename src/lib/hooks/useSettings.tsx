'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

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

const SettingsContext = createContext<PlatformSettings>(DEFAULTS)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<PlatformSettings>(DEFAULTS)
  const supabase = createClient()

  useEffect(() => {
    supabase
      .from('platform_settings')
      .select('key, value')
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, string> = {}
        for (const row of data) map[row.key] = row.value
        setSettings({
          whatsapp: map.whatsapp || DEFAULTS.whatsapp,
          email: map.email || DEFAULTS.email,
          city: map.city || DEFAULTS.city,
          platform_name: map.platform_name || DEFAULTS.platform_name,
          platform_url: map.platform_url || DEFAULTS.platform_url,
        })
      })
  }, [supabase])

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

/** Build WhatsApp URL with platform number */
export function buildWhatsappUrl(phone: string, message?: string): string {
  const clean = phone.replace(/\D/g, '')
  const encoded = message ? encodeURIComponent(message) : ''
  return `https://wa.me/${clean}${encoded ? `?text=${encoded}` : ''}`
}
