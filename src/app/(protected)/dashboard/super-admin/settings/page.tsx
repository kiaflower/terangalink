'use client'

import { useEffect, useState } from 'react'
import { Settings as SettingsIcon, Check, AlertTriangle, Bell } from 'lucide-react'
import { NotificationSettings } from '@/components/dashboard/NotificationSettings'

const NOTIF_FIELDS = [
  { key: 'admin_notif_no_new_product_days', label: 'Pas de nouveau plat depuis (jours)', placeholder: '14' },
  { key: 'admin_notif_no_product_ever_days', label: "Restaurant jamais publiée après (jours)", placeholder: '7' },
  { key: 'admin_notif_inactive_restaurant_days', label: 'Restaurant inactive depuis (jours)', placeholder: '30' },
  { key: 'admin_notif_product_limit_percent', label: 'Alerte limite de plan atteinte à (%)', placeholder: '80' },
]

const NOTIF_TOGGLES: Array<{ key: string; label: string; hint: string }> = [
  { key: 'admin_notif_new_signup_enabled', label: 'Nouvelle inscription', hint: 'Dès qu\'une demande d\'inscription est soumise' },
  { key: 'admin_notif_no_new_product_enabled', label: 'Menu figé / restaurant sans plat', hint: 'Pas de nouveau plat, ou aucun plat jamais publié' },
  { key: 'admin_notif_inactive_restaurant_enabled', label: 'Restaurant inactive', hint: 'Pas de connexion depuis le seuil configuré' },
  { key: 'admin_notif_overdue_invoice_enabled', label: 'Facture impayée', hint: 'Facture au statut "en retard"' },
  { key: 'admin_notif_product_limit_enabled', label: 'Proche de la limite de plan', hint: 'Free/Starter proches de leur limite de plats' },
  { key: 'admin_notif_periodic_reminder_enabled', label: 'Rappel périodique', hint: 'Lundi, mercredi et vendredi — bilan + suggestion' },
]

const FIELDS = [
  { key: 'platform_url', label: 'URL de la plateforme', placeholder: 'https://terangalink.com' },
  { key: 'support_phone', label: 'Téléphone support', placeholder: '+221 77 000 00 00' },
  { key: 'support_whatsapp', label: 'WhatsApp support', placeholder: '+221 77 000 00 00' },
  { key: 'support_email', label: 'Email support', placeholder: 'support@terangalink.com' },
  { key: 'instagram_url', label: 'Lien Instagram', placeholder: 'https://instagram.com/terangalink' },
  { key: 'facebook_url', label: 'Lien Facebook', placeholder: 'https://facebook.com/terangalink' },
  { key: 'tiktok_url', label: 'Lien TikTok', placeholder: 'https://tiktok.com/@terangalink' },
  { key: 'plan_starter_price', label: 'Prix plan Starter (FCFA/mois)', placeholder: '9900' },
  { key: 'plan_pro_price', label: 'Prix plan Pro (FCFA/mois)', placeholder: '19900' },
  { key: 'subscription_payment_number', label: 'Numéro de paiement abonnement (Wave / Orange Money)', placeholder: '77 000 00 00' },
  { key: 'maintenance_message', label: 'Message de maintenance', placeholder: 'Retour dans quelques minutes...' },
]

const inputClass = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors'

export default function SettingsPage() {
  const [values, setValues] = useState<Record<string, string>>({})
  const [maintenance, setMaintenance] = useState(false)
  const [notifToggles, setNotifToggles] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_TOGGLES.map(t => [t.key, true]))
  )
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/super-admin/platform-settings')
      .then(r => r.json())
      .then(data => {
        const map: Record<string, string> = {}
        for (const row of data.settings ?? []) map[row.key] = row.value
        setValues(map)
        setMaintenance(map['maintenance_mode'] === 'true')
        // Absent en base = jamais configuré = valeur par défaut (activé),
        // pas "désactivé" — cohérent avec getAdminNotificationSettings côté serveur.
        setNotifToggles(Object.fromEntries(
          NOTIF_TOGGLES.map(t => [t.key, map[t.key] === undefined ? true : map[t.key] === 'true'])
        ))
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    const settings = [
      ...FIELDS.map(f => ({ key: f.key, value: values[f.key] ?? '' })),
      ...NOTIF_FIELDS.map(f => ({ key: f.key, value: values[f.key] ?? '' })),
      ...NOTIF_TOGGLES.map(t => ({ key: t.key, value: String(notifToggles[t.key]) })),
      { key: 'maintenance_mode', value: String(maintenance) },
    ]
    const res = await fetch('/api/super-admin/platform-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    })
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erreur lors de la sauvegarde')
    } else {
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    }
    setSaving(false)
  }

  return (
    <div className="max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
        <p className="text-gray-500 text-sm mt-1">Configuration globale de la plateforme</p>
      </div>

      {loading ? (
        <p className="text-gray-500 text-sm">Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          <NotificationSettings variant="admin" />

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-gray-900 font-semibold mb-1 flex items-center gap-2">
              <Bell className="w-4 h-4 text-brand-orange" />
              Alertes Super Admin
            </h2>
            <p className="text-xs text-gray-500">Choisissez quelles alertes déclenchent une notification, et à partir de quel seuil.</p>

            <div className="space-y-3">
              {NOTIF_TOGGLES.map(t => (
                <label key={t.key} className="flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notifToggles[t.key] ?? true}
                    onChange={e => setNotifToggles(v => ({ ...v, [t.key]: e.target.checked }))}
                    className="mt-0.5 w-4 h-4 accent-brand-orange"
                  />
                  <span>
                    <span className="block text-sm text-gray-900">{t.label}</span>
                    <span className="block text-xs text-gray-400">{t.hint}</span>
                  </span>
                </label>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-100">
              {NOTIF_FIELDS.map(f => (
                <div key={f.key}>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                  <input
                    type="number"
                    min={1}
                    value={values[f.key] ?? ''}
                    onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    className={inputClass}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="text-gray-900 font-semibold mb-2 flex items-center gap-2">
              <SettingsIcon className="w-4 h-4 text-brand-orange" />
              Paramètres généraux
            </h2>
            {FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-medium text-gray-500 mb-1.5">{f.label}</label>
                <input
                  type="text"
                  value={values[f.key] ?? ''}
                  onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))}
                  placeholder={f.placeholder}
                  className={inputClass}
                />
              </div>
            ))}
          </div>

          <div className={`rounded-2xl p-5 border-2 ${maintenance ? 'border-red-300 bg-red-50' : 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className={`w-4 h-4 ${maintenance ? 'text-red-500' : 'text-gray-400'}`} />
                  <p className="font-semibold text-gray-900 text-sm">Mode maintenance</p>
                </div>
                <p className="text-xs text-gray-500">
                  Active une page de maintenance visible par tous les visiteurs non-admin.
                </p>
                {maintenance && (
                  <p className="text-xs text-red-600 font-medium mt-1.5">⚠ La plateforme est actuellement en maintenance</p>
                )}
              </div>
              <button
                type="button"
                onClick={() => setMaintenance(m => !m)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none ${maintenance ? 'bg-red-500' : 'bg-gray-200'}`}
                role="switch"
                aria-checked={maintenance}
              >
                <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${maintenance ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
          </div>

          {error && (
            <p className="text-red-600 text-sm bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
          )}
          {success && (
            <p className="text-green-700 text-sm flex items-center gap-1.5"><Check className="w-4 h-4" /> Paramètres enregistrés</p>
          )}

          <button
            type="submit"
            disabled={saving}
            className="w-full bg-brand-orange hover:bg-brand-orange-dark text-white py-2.5 rounded-xl font-medium transition-colors disabled:opacity-50"
          >
            {saving ? 'Enregistrement...' : 'Enregistrer les paramètres'}
          </button>
        </form>
      )}
    </div>
  )
}
