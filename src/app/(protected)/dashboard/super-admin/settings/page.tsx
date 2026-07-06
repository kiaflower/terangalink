'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Globe, MessageCircle, Mail, Palette, Settings, Shield,
  Save, CheckCircle, Loader2, AlertCircle, Info,
  ToggleLeft, ToggleRight, ChevronDown, ChevronUp,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/Input'

function SmtpTest() {
  const [testEmail, setTestEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null)

  async function handleTest() {
    if (!testEmail.trim()) return
    setSending(true)
    setResult(null)
    try {
      const res = await fetch('/api/admin/test-smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to_email: testEmail.trim() }),
      })
      const data = await res.json()
      if (res.ok) {
        setResult({ ok: true, message: `✅ Email envoyé à ${testEmail}` })
      } else {
        setResult({ ok: false, message: `❌ Erreur : ${data.error || 'Inconnue'}` })
      }
    } catch (e) {
      setResult({ ok: false, message: `❌ Erreur réseau : ${e instanceof Error ? e.message : 'Inconnue'}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-gray-500 text-xs">
        Envoie un email de test pour vérifier que SMTP_HOST, SMTP_USER et SMTP_PASS sont bien configurés en production.
      </p>
      <div className="flex gap-2">
        <input
          type="email"
          value={testEmail}
          onChange={e => setTestEmail(e.target.value)}
          placeholder="ton@email.com"
          className="flex-1 bg-gray-100 border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-orange/40"
        />
        <button
          onClick={handleTest}
          disabled={sending || !testEmail.trim()}
          className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange/90 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
          Tester
        </button>
      </div>
      {result && (
        <p className={`text-sm font-medium ${result.ok ? 'text-green-400' : 'text-red-400'}`}>
          {result.message}
        </p>
      )}
    </div>
  )
}


function Section({
  icon: Icon, title, description, children, defaultOpen = true
}: {
  icon: React.ElementType; title: string; description?: string; children: React.ReactNode; defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden">
      <button className="w-full flex items-center justify-between p-5 hover:bg-gray-100 transition-colors" onClick={() => setOpen(!open)}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-orange/10 rounded-xl flex items-center justify-center">
            <Icon className="w-4 h-4 text-brand-orange" />
          </div>
          <div className="text-left">
            <p className="text-gray-900 font-semibold text-sm">{title}</p>
            {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
          </div>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>
      {open && <div className="px-5 pb-5 border-t border-gray-200 pt-4 space-y-4">{children}</div>}
    </div>
  )
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description?: string; value: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div>
        <p className="text-gray-900 text-sm font-medium">{label}</p>
        {description && <p className="text-gray-500 text-xs mt-0.5">{description}</p>}
      </div>
      <button onClick={() => onChange(!value)} className="flex-shrink-0 ml-4">
        {value ? <ToggleRight className="w-7 h-7 text-green-400" /> : <ToggleLeft className="w-7 h-7 text-gray-500" />}
      </button>
    </div>
  )
}

export default function SuperAdminSettingsPage() {
  const supabase = createClient()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [totalRestaurants, setTotalRestaurants] = useState(0)
  const [totalAdmins, setTotalAdmins] = useState(0)

  const [platformName, setPlatformName] = useState('TerangaLink')
  const [platformUrl, setPlatformUrl] = useState('https://terangalink.sn')
  const [whatsappPrincipal, setWhatsappPrincipal] = useState('221700000000')
  const [emailSupport, setEmailSupport] = useState('support@terangalink.sn')
  const [maintenanceMode, setMaintenanceMode] = useState(false)
  const [allowSignup, setAllowSignup] = useState(false)
  const [demoActive, setDemoActive] = useState(true)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true)
  const [prixStarter, setPrixStarter] = useState('9900')
  const [prixPro, setPrixPro] = useState('19900')

  const loadStats = useCallback(async () => {
    const [{ count: r }, { count: a }, { data: settingsData }] = await Promise.all([
      supabase.from('restaurants').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'restaurant_admin'),
      supabase.from('platform_settings').select('key, value'),
    ])
    setTotalRestaurants(r ?? 0)
    setTotalAdmins(a ?? 0)
    // Load saved settings
    if (settingsData) {
      const map: Record<string, string> = {}
      for (const row of settingsData) map[row.key] = row.value
      if (map.whatsapp) setWhatsappPrincipal(map.whatsapp)
      if (map.email) setEmailSupport(map.email)
      if (map.platform_name) setPlatformName(map.platform_name)
      if (map.platform_url) setPlatformUrl(map.platform_url)
    }
  }, [supabase])

  useEffect(() => { loadStats() }, [loadStats])

  async function handleSave() {
    setSaving(true)
    // Save to platform_settings table
    const updates = [
      { key: 'whatsapp', value: whatsappPrincipal },
      { key: 'email', value: emailSupport },
      { key: 'platform_name', value: platformName },
      { key: 'platform_url', value: platformUrl },
    ]
    for (const u of updates) {
      await supabase
        .from('platform_settings')
        .upsert({ key: u.key, value: u.value }, { onConflict: 'key' })
    }
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 sm:p-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres plateforme</h1>
          <p className="text-gray-500 text-sm mt-1">Configuration globale de TerangaLink</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saved ? 'Sauvegardé !' : 'Enregistrer'}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Restaurants', value: totalRestaurants, color: 'text-brand-orange' },
          { label: 'Admins', value: totalAdmins, color: 'text-blue-400' },
          { label: 'Version', value: 'v4.0', color: 'text-purple-400' },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-500 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="space-y-4">
        <Section icon={Globe} title="Informations plateforme" description="Nom, URL et contacts officiels">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Nom de la plateforme" value={platformName} onChange={e => setPlatformName(e.target.value)} />
            <Input label="URL officielle" value={platformUrl} onChange={e => setPlatformUrl(e.target.value)} />
            <Input label="WhatsApp principal" value={whatsappPrincipal} onChange={e => setWhatsappPrincipal(e.target.value)} hint="Sans + ni espaces : 221771234567" />
            <Input label="Email support" type="email" value={emailSupport} onChange={e => setEmailSupport(e.target.value)} />
          </div>
          <div className="bg-gray-100 rounded-xl p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-xs">✅ Ces modifications s&apos;appliquent automatiquement partout : landing page, footer, emails, QR codes, liens d&apos;upgrade.</p>
          </div>
        </Section>

        <Section icon={Settings} title="Tarifs abonnements" description="Prix affichés sur la landing page (FCFA)">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { label: 'Starter (FCFA/mois)', value: prixStarter, set: setPrixStarter },
              { label: 'Pro (FCFA/mois)', value: prixPro, set: setPrixPro },
            ].map(p => (
              <div key={p.label}>
                <label className="text-gray-500 text-xs block mb-1.5">{p.label}</label>
                <input type="number" value={p.value} onChange={e => p.set(e.target.value)} className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
              </div>
            ))}
          </div>
          <div className="bg-gray-100 rounded-xl p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-xs">Pour changer les prix dans la logique des plans, modifie <code className="text-brand-orange">PLAN_PRICES</code> dans <code className="text-brand-orange">src/lib/plans.ts</code>.</p>
          </div>
        </Section>

        <Section icon={Shield} title="Système" description="Maintenance, inscriptions, démonstration">
          <ToggleRow label="Mode maintenance" description="Les visiteurs voient une page d'indisponibilité. Les admins restent connectés." value={maintenanceMode} onChange={setMaintenanceMode} />
          {maintenanceMode && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs p-3 rounded-xl">
              ⚠️ Mode maintenance activé. Les visiteurs ne peuvent pas accéder au site.
            </div>
          )}
          <ToggleRow label="Nouvelles inscriptions" description="Permettre de nouveaux comptes. Actuellement géré manuellement via WhatsApp." value={allowSignup} onChange={setAllowSignup} />
          <ToggleRow label="Restaurant démo actif" description="Le restaurant démo est accessible depuis le bouton Voir la démo." value={demoActive} onChange={setDemoActive} />
          <ToggleRow label="Analytics activés" description="Enregistrer les vues et ajouts au panier pour les statistiques restaurants." value={analyticsEnabled} onChange={setAnalyticsEnabled} />
        </Section>

        <Section icon={Palette} title="Branding dashboard" description="Identité visuelle TerangaLink" defaultOpen={false}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-gray-500 text-xs block mb-2">Couleur principale</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-gray-300" style={{ backgroundColor: '#F97316' }} />
                <div>
                  <p className="text-gray-900 text-sm font-mono">#F97316</p>
                  <p className="text-gray-500 text-xs">Orange TerangaLink</p>
                </div>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-2">Fond dashboard</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border border-gray-300" style={{ backgroundColor: '#FFFFFF' }} />
                <div>
                  <p className="text-gray-900 text-sm font-mono">#FFFFFF</p>
                  <p className="text-gray-500 text-xs">Noir profond</p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-100 rounded-xl p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-brand-orange flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-xs">Couleurs dashboard fixes par design. Pour modifier, édite <code className="text-brand-orange">tailwind.config.ts</code>.</p>
          </div>
        </Section>

        <Section icon={MessageCircle} title="Notifications" description="Alertes et communications" defaultOpen={false}>
          <ToggleRow label="Notification nouvelle inscription" description="Message WhatsApp à chaque nouveau restaurant." value={false} onChange={() => {}} />
          <ToggleRow label="Alerte abonnement expiré" description="Alerte 7 jours avant expiration." value={false} onChange={() => {}} />
          <ToggleRow label="Rapport hebdomadaire" description="Résumé automatique chaque lundi." value={false} onChange={() => {}} />
          <div className="bg-gray-100 rounded-xl p-3 flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <p className="text-gray-500 text-xs">Les notifications automatiques nécessitent une intégration WhatsApp Business API. Disponible dans une prochaine version.</p>
          </div>
        </Section>

        <Section icon={Mail} title="Test SMTP — Emails" description="Vérifier que les emails partent correctement" defaultOpen={false}>
          <SmtpTest />
        </Section>

        <Section icon={Mail} title="Contact & support" description="Résumé des coordonnées publiques" defaultOpen={false}>
          <div className="bg-gray-100 rounded-xl p-4 space-y-2.5">
            {[
              { label: 'Email support', value: emailSupport },
              { label: 'WhatsApp inscriptions', value: `+${whatsappPrincipal}` },
              { label: 'URL plateforme', value: platformUrl },
              { label: 'Nom plateforme', value: platformName },
            ].map(row => (
              <div key={row.label} className="flex justify-between text-sm">
                <span className="text-gray-500">{row.label}</span>
                <span className="text-gray-900 font-medium">{row.value}</span>
              </div>
            ))}
          </div>
        </Section>
      </div>
    </div>
  )
}
