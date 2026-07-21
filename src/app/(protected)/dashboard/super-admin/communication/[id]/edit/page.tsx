'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Save, Send, Clock, X, Loader2, Eye, Trash2, BarChart3 } from 'lucide-react'
import { BlockEditor } from '@/components/newsletter/BlockEditor'
import { PreviewPane } from '@/components/newsletter/PreviewPane'
import { SegmentPicker } from '@/components/newsletter/SegmentPicker'
import { CollapsibleSection } from '@/components/newsletter/CollapsibleSection'
import type { NewsletterBlock, NewsletterCampaignRow, NewsletterSegment } from '@/lib/types/database'

export default function EditCampaignPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const campaignId = params.id

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [status, setStatus] = useState<NewsletterCampaignRow['status']>('draft')
  const [scheduledAt, setScheduledAt] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [subject, setSubject] = useState('')
  const [previewText, setPreviewText] = useState('')
  const [fromName, setFromName] = useState('TerangaSpot')
  const [blocks, setBlocks] = useState<NewsletterBlock[]>([])
  const [segment, setSegment] = useState<NewsletterSegment>({ type: 'all' })

  const [showTestModal, setShowTestModal] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [sendingTest, setSendingTest] = useState(false)
  const [testResult, setTestResult] = useState<string | null>(null)

  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleValue, setScheduleValue] = useState('')
  const [scheduling, setScheduling] = useState(false)
  const [sendingNow, setSendingNow] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const disabled = status !== 'draft'

  const load = useCallback(async () => {
    const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}`)
    if (res.ok) {
      const data = await res.json()
      const c = data.campaign as NewsletterCampaignRow
      setName(c.name)
      setSubject(c.subject)
      setPreviewText(c.preview_text ?? '')
      setFromName(c.from_name)
      setBlocks(c.blocks ?? [])
      setSegment(c.segment ?? { type: 'all' })
      setStatus(c.status)
      setScheduledAt(c.scheduled_at)
      setDirty(false)
    }
    setLoading(false)
  }, [campaignId])

  useEffect(() => { load() }, [load])

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/super-admin/communication/campaigns/${campaignId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, subject, preview_text: previewText || null, from_name: fromName, blocks, segment }),
      })
      setDirty(false)
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    setSendingTest(true)
    setTestResult(null)
    try {
      const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}/send-test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: testEmail, subject, from_name: fromName, preview_text: previewText, blocks }),
      })
      const data = await res.json()
      setTestResult(res.ok ? 'Email de test envoyé.' : (data.error || "Échec de l'envoi."))
    } catch {
      setTestResult("Échec de l'envoi.")
    } finally {
      setSendingTest(false)
    }
  }

  async function schedule() {
    setActionError(null)
    if (dirty) await save()
    setScheduling(true)
    try {
      const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduled_at: scheduleValue ? new Date(scheduleValue).toISOString() : null }),
      })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Erreur'); return }
      setShowScheduleModal(false)
      await load()
    } finally {
      setScheduling(false)
    }
  }

  async function sendNow() {
    setActionError(null)
    if (!confirm('Envoyer cette campagne maintenant aux destinataires du segment sélectionné ?')) return
    if (dirty) await save()
    setSendingNow(true)
    try {
      const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}/send-now`, { method: 'POST' })
      const data = await res.json()
      if (!res.ok) { setActionError(data.error || 'Erreur'); return }
      if (data.done) {
        router.push(`/dashboard/super-admin/communication/${campaignId}`)
      } else {
        await load()
      }
    } finally {
      setSendingNow(false)
    }
  }

  async function unschedule() {
    if (!confirm('Repasser cette campagne en brouillon ? La programmation sera annulée.')) return
    await fetch(`/api/super-admin/communication/campaigns/${campaignId}/unschedule`, { method: 'POST' })
    await load()
  }

  async function deleteCampaign() {
    if (!confirm('Supprimer définitivement ce brouillon ?')) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setActionError(data.error || 'Erreur'); return }
      router.push('/dashboard/super-admin/communication')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <p className="text-sm text-gray-400">Chargement…</p>

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/dashboard/super-admin/communication" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4" /> Communication
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          {disabled && (
            <Link
              href={`/dashboard/super-admin/communication/${campaignId}`}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:border-gray-300"
            >
              <BarChart3 className="w-4 h-4" /> Statistiques
            </Link>
          )}
          {status === 'scheduled' && (
            <button onClick={unschedule} className="text-xs text-gray-500 hover:text-red-500 border border-gray-200 rounded-lg px-3 py-2">
              Annuler la programmation
            </button>
          )}
          {!disabled && (
            <button
              onClick={deleteCampaign}
              disabled={deleting}
              className="inline-flex items-center gap-1.5 text-sm text-gray-500 border border-gray-200 rounded-xl px-3 py-2 hover:border-red-300 hover:text-red-500 disabled:opacity-50"
            >
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Supprimer
            </button>
          )}
          {!disabled && (
            <button
              onClick={save}
              disabled={saving || !dirty}
              className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:border-gray-300 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Enregistrer le brouillon
            </button>
          )}
          <button
            onClick={() => setShowTestModal(true)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-600 border border-gray-200 rounded-xl px-3 py-2 hover:border-gray-300"
          >
            Email de test
          </button>
          {!disabled && (
            <>
              <button
                onClick={() => setShowScheduleModal(true)}
                className="inline-flex items-center gap-1.5 text-sm text-brand-violet border border-brand-violet/30 rounded-xl px-3 py-2 hover:bg-brand-violet/5"
              >
                <Clock className="w-4 h-4" /> Programmer
              </button>
              <button
                onClick={sendNow}
                disabled={sendingNow}
                className="inline-flex items-center gap-1.5 text-sm text-white bg-brand-violet rounded-xl px-3 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {sendingNow ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                Envoyer maintenant
              </button>
            </>
          )}
        </div>
      </div>

      {actionError && <p className="text-sm text-red-500 mb-4">{actionError}</p>}
      {status === 'scheduled' && scheduledAt && (
        <p className="text-sm text-amber-600 mb-4">Programmée pour le {new Date(scheduledAt).toLocaleString('fr-FR')}.</p>
      )}
      {status === 'sending' && <p className="text-sm text-blue-600 mb-4">Envoi en cours… rechargez cette page pour suivre la progression.</p>}

      <div className="max-w-2xl space-y-4">
        <CollapsibleSection title="Détails de la campagne" subtitle="Nom interne, objet, expéditeur" defaultOpen={!subject}>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Nom de la campagne (interne)</label>
            <input
              value={name}
              disabled={disabled}
              onChange={e => { setName(e.target.value); setDirty(true) }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Objet de l&apos;email</label>
            <input
              value={subject}
              disabled={disabled}
              onChange={e => { setSubject(e.target.value); setDirty(true) }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Texte d&apos;aperçu (optionnel)</label>
            <input
              value={previewText}
              disabled={disabled}
              onChange={e => { setPreviewText(e.target.value); setDirty(true) }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:bg-gray-50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Expéditeur</label>
            <input
              value={fromName}
              disabled={disabled}
              onChange={e => { setFromName(e.target.value); setDirty(true) }}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 disabled:bg-gray-50"
            />
          </div>
        </CollapsibleSection>

        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Contenu</p>
          <BlockEditor blocks={blocks} onChange={b => { setBlocks(b); setDirty(true) }} disabled={disabled} />
        </div>

        <CollapsibleSection title="Destinataires" subtitle="Segment ciblé par cette campagne">
          <SegmentPicker campaignId={campaignId} segment={segment} onChange={s => { setSegment(s); setDirty(true) }} disabled={disabled} />
        </CollapsibleSection>
      </div>

      <button
        onClick={() => setShowPreview(true)}
        className="fixed bottom-6 right-6 z-40 inline-flex items-center gap-1.5 bg-black text-white text-xs font-medium rounded-full pl-3 pr-3.5 py-2 shadow-lg hover:opacity-90 transition-opacity"
      >
        <Eye className="w-3.5 h-3.5" />
        Aperçu
      </button>

      {showPreview && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setShowPreview(false)}>
          <div className="w-full max-w-md h-full bg-white shadow-xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 shrink-0">
              <h2 className="text-sm font-semibold text-gray-900">Aperçu de l&apos;email</h2>
              <button onClick={() => setShowPreview(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 overflow-auto p-4">
              <PreviewPane campaignId={campaignId} blocks={blocks} previewText={previewText || null} />
            </div>
          </div>
        </div>
      )}

      {showTestModal && (
        <Modal onClose={() => setShowTestModal(false)} title="Envoyer un email de test">
          <input
            type="email"
            placeholder="admin@teranga-spot.com"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3"
          />
          {testResult && <p className="text-xs text-gray-500 mb-3">{testResult}</p>}
          <button
            onClick={sendTest}
            disabled={sendingTest || !testEmail}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-white bg-brand-violet rounded-xl px-3 py-2.5 disabled:opacity-50"
          >
            {sendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Envoyer le test
          </button>
        </Modal>
      )}

      {showScheduleModal && (
        <Modal onClose={() => setShowScheduleModal(false)} title="Programmer l'envoi">
          <input
            type="datetime-local"
            value={scheduleValue}
            onChange={e => setScheduleValue(e.target.value)}
            className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 mb-3"
          />
          {actionError && <p className="text-xs text-red-500 mb-3">{actionError}</p>}
          <button
            onClick={schedule}
            disabled={scheduling || !scheduleValue}
            className="w-full inline-flex items-center justify-center gap-1.5 text-sm text-white bg-brand-violet rounded-xl px-3 py-2.5 disabled:opacity-50"
          >
            {scheduling ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Confirmer la programmation
          </button>
        </Modal>
      )}
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
