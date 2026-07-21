'use client'

import { useEffect } from 'react'

// Scope /dashboard/ : ce service worker ne doit affecter que les tableaux de
// bord (boutique + super-admin), jamais le site public.
export function RegisterServiceWorker() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/dashboard/' }).catch((err) => {
      console.error('SW registration failed:', err)
    })
  }, [])

  return null
}
