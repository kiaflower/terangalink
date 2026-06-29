'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert, X } from 'lucide-react'

interface ImpersonationData {
  restaurantId: string
  restaurantName: string
  superAdminId: string
  expiresAt: number
}

export function ImpersonationBanner() {
  const [data, setData] = useState<ImpersonationData | null>(null)
  const [leaving, setLeaving] = useState(false)

  useEffect(() => {
    function readCookie() {
      const match = document.cookie.match(/(?:^|;\s*)sa_impersonate=([^;]*)/)
      if (!match) { setData(null); return }
      try {
        const parsed: ImpersonationData = JSON.parse(decodeURIComponent(match[1]))
        if (parsed.expiresAt < Date.now()) {
          setData(null)
          document.cookie = 'sa_impersonate=; max-age=0; path=/'
        } else {
          setData(parsed)
        }
      } catch { setData(null) }
    }

    readCookie()
    const id = setInterval(readCookie, 60_000)
    return () => clearInterval(id)
  }, [])

  async function handleLeave() {
    setLeaving(true)
    await fetch('/api/super-admin/impersonate', { method: 'DELETE' })
    window.location.href = '/dashboard/super-admin/restaurants'
  }

  if (!data) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-[200] flex items-center justify-between px-4 py-2.5 text-white text-sm font-medium"
      style={{ backgroundColor: '#F97316' }}>
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 flex-shrink-0" />
        <span>
          Vous consultez le dashboard de <strong>{data.restaurantName}</strong> en tant qu&apos;administrateur
        </span>
      </div>
      <button
        onClick={handleLeave}
        disabled={leaving}
        className="flex items-center gap-1.5 ml-4 px-3 py-1 rounded-lg text-xs font-bold bg-white/20 hover:bg-white/30 transition-colors flex-shrink-0 disabled:opacity-60"
      >
        <X className="w-3.5 h-3.5" />
        Quitter
      </button>
    </div>
  )
}
