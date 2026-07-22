'use client'

import { useEffect, useState } from 'react'
import { Bell, BellOff, Check } from 'lucide-react'
import { subscribeToPush, unsubscribeFromPush, getPushSubscriptionState, type PushContext } from '@/lib/push/subscribeClient'

interface Settings {
  new_order_enabled: boolean
  cart_abandonment_enabled: boolean
  cart_abandonment_delay_hours: number
  weekly_report_auto_enabled: boolean
  recommendations_enabled: boolean
  pending_orders_enabled: boolean
  pending_orders_delay_hours: number
  review_received_enabled: boolean
}

const DEFAULT_SETTINGS: Settings = {
  new_order_enabled: true,
  cart_abandonment_enabled: true,
  cart_abandonment_delay_hours: 48,
  weekly_report_auto_enabled: true,
  recommendations_enabled: true,
  pending_orders_enabled: true,
  pending_orders_delay_hours: 48,
  review_received_enabled: true,
}

type ToggleKey = keyof Omit<Settings, 'cart_abandonment_delay_hours' | 'pending_orders_delay_hours'>

const TOGGLES: Array<{ key: ToggleKey; label: string; hint: string }> = [
  { key: 'new_order_enabled', label: 'Nouvelle commande', hint: 'Notification immédiate à chaque commande reçue' },
  { key: 'cart_abandonment_enabled', label: 'Paniers abandonnés', hint: 'Résumé quotidien des paniers laissés sans commander' },
  { key: 'pending_orders_enabled', label: 'Commandes à mettre à jour', hint: 'Rappel des commandes pas encore marquées "livrée" — sinon elles ne comptent pas dans vos revenus' },
  { key: 'review_received_enabled', label: 'Avis reçu', hint: "Notification dès qu'un client laisse un avis" },
  { key: 'weekly_report_auto_enabled', label: 'Rapport hebdomadaire', hint: 'Résumé de la semaine chaque lundi' },
  { key: 'recommendations_enabled', label: 'Recommandations', hint: 'Conseils basés sur vos statistiques (1 notification/jour max)' },
]

export function NotificationSettings({ variant = 'restaurant' }: { variant?: PushContext }) {
  const [subState, setSubState] = useState<'loading' | 'unsupported' | 'denied' | 'subscribed' | 'not-subscribed'>('loading')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  useEffect(() => {
    getPushSubscriptionState().then(setSubState)
    if (variant === 'restaurant') {
      fetch('/api/pwa/push/settings').then(r => r.ok ? r.json() : null).then(data => {
        if (data) setSettings(data)
      })
    }
  }, [variant])

  const handleActivate = async () => {
    setBusy(true)
    setMsg(null)
    try {
      await subscribeToPush(variant)
      setSubState('subscribed')
      setMsg({ ok: true, text: 'Notifications activées.' })
    } catch (err) {
      setMsg({ ok: false, text: err instanceof Error ? err.message : 'Impossible d\'activer les notifications.' })
    } finally {
      setBusy(false)
    }
  }

  const handleDeactivate = async () => {
    setBusy(true)
    try {
      await unsubscribeFromPush()
      setSubState('not-subscribed')
      setMsg({ ok: true, text: 'Notifications désactivées sur cet appareil.' })
    } finally {
      setBusy(false)
    }
  }

  const saveSettings = async (next: Settings) => {
    setSettings(next)
    await fetch('/api/pwa/push/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
  }

  if (subState === 'unsupported') return null

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6">
      <h2 className="font-semibold text-gray-900 text-sm mb-1 flex items-center gap-2">
        <Bell className="w-4 h-4 text-brand-orange" />
        Notifications
      </h2>
      <p className="text-xs text-gray-500 mb-4">
        {variant === 'restaurant'
          ? "Recevez des alertes sur cet appareil (nouvelles commandes, paniers abandonnés…). Sur iPhone, le tableau de bord doit être ajouté à l'écran d'accueil."
          : "Recevez les alertes Super Admin sur cet appareil. Sur iPhone, le dashboard doit être ajouté à l'écran d'accueil."}
      </p>

      {subState === 'denied' && (
        <p className="text-xs text-red-500 mb-3">
          Notifications bloquées par le navigateur. Autorisez-les dans les réglages du site pour les activer.
        </p>
      )}

      {subState !== 'denied' && (
        <button
          onClick={subState === 'subscribed' ? handleDeactivate : handleActivate}
          disabled={busy || subState === 'loading'}
          className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
            subState === 'subscribed'
              ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              : 'bg-brand-orange text-white hover:bg-brand-orange-dark'
          }`}
        >
          {subState === 'subscribed' ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
          {subState === 'subscribed' ? 'Désactiver sur cet appareil' : 'Activer les notifications'}
        </button>
      )}

      {msg && (
        <p className={`text-xs mt-2 flex items-center gap-1.5 ${msg.ok ? 'text-green-600' : 'text-red-500'}`}>
          {msg.ok ? <Check className="w-3.5 h-3.5" /> : null}{msg.text}
        </p>
      )}

      {variant === 'restaurant' && (
        <div className="mt-5 pt-5 border-t border-gray-100 space-y-3">
          {TOGGLES.map(({ key, label, hint }) => (
            <label key={key} className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={settings[key]}
                onChange={e => saveSettings({ ...settings, [key]: e.target.checked })}
                className="mt-0.5 w-4 h-4 accent-brand-orange"
              />
              <span>
                <span className="block text-sm text-gray-900">{label}</span>
                <span className="block text-xs text-gray-400">{hint}</span>
              </span>
            </label>
          ))}

          {settings.cart_abandonment_enabled && (
            <div className="pl-7">
              <label className="block text-xs text-gray-500 mb-1">Délai avant de considérer un panier comme abandonné</label>
              <select
                value={settings.cart_abandonment_delay_hours}
                onChange={e => saveSettings({ ...settings, cart_abandonment_delay_hours: Number(e.target.value) })}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900"
              >
                <option value={12}>12 heures</option>
                <option value={24}>24 heures</option>
                <option value={48}>48 heures</option>
                <option value={72}>72 heures</option>
              </select>
            </div>
          )}

          {settings.pending_orders_enabled && (
            <div className="pl-7">
              <label className="block text-xs text-gray-500 mb-1">Délai avant le rappel de mise à jour d&apos;une commande</label>
              <select
                value={settings.pending_orders_delay_hours}
                onChange={e => saveSettings({ ...settings, pending_orders_delay_hours: Number(e.target.value) })}
                className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900"
              >
                <option value={24}>24 heures</option>
                <option value={48}>48 heures</option>
                <option value={72}>72 heures</option>
                <option value={168}>7 jours</option>
              </select>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
