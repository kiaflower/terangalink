'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, ArrowRight, Plus, Trash2, ArrowUp, ArrowDown, Download } from 'lucide-react'
import { FicheStatusBadge } from '@/components/ui/FicheStatusBadge'
import { downloadFichePdf } from '@/lib/pdf/downloadFichePdf'
import { pdfRegenerateUnlockAt, formatRegenerateRemaining } from '@/lib/pdf/regenerateLock'

const inputClass = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors'
const textareaClass = inputClass + ' resize-none'
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'

interface Category {
  id: string
  code: string
  name: string
  color: string
}

interface FormState {
  category_id: string
  title: string
  pitch: string
  status: string
  subtitle: string
  why_it_matters: string
  key_points: string[]
  example: string
  common_mistake: string
  action_step: string
}

const EMPTY_FORM: FormState = {
  category_id: '', title: '', pitch: '', status: 'brouillon',
  subtitle: '', why_it_matters: '', key_points: [], example: '', common_mistake: '', action_step: '',
}

function formatNumero(n: number): string {
  return `#${String(n).padStart(3, '0')}`
}

export function FicheForm({ ficheId }: { ficheId?: string }) {
  const supabase = createClient()
  const router = useRouter()

  const [categories, setCategories] = useState<Category[]>([])
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [numero, setNumero] = useState<number | null>(null)
  const [lastGeneratedAt, setLastGeneratedAt] = useState<string | null>(null)
  const [nextFicheId, setNextFicheId] = useState<string | null>(null)
  const [loading, setLoading] = useState(!!ficheId)
  const [saving, setSaving] = useState<'save' | 'save-pdf' | 'save-next' | null>(null)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const load = useCallback(async () => {
    const { data: cats } = await supabase.from('fiche_categories').select('id, code, name, color').order('sort_order')
    setCategories((cats ?? []) as Category[])

    if (ficheId) {
      const { data: fiche } = await supabase.from('fiches')
        .select('numero, category_id, title, pitch, status, subtitle, why_it_matters, key_points, example, common_mistake, action_step, last_generated_at')
        .eq('id', ficheId).single()
      if (fiche) {
        setNumero(fiche.numero)
        setLastGeneratedAt(fiche.last_generated_at)
        setForm({
          category_id: fiche.category_id,
          title: fiche.title,
          pitch: fiche.pitch ?? '',
          status: fiche.status,
          subtitle: fiche.subtitle ?? '',
          why_it_matters: fiche.why_it_matters ?? '',
          key_points: Array.isArray(fiche.key_points) ? fiche.key_points as string[] : [],
          example: fiche.example ?? '',
          common_mistake: fiche.common_mistake ?? '',
          action_step: fiche.action_step ?? '',
        })

        const { data: nextFiche } = await supabase.from('fiches')
          .select('id').gt('numero', fiche.numero).order('numero', { ascending: true }).limit(1).maybeSingle()
        setNextFicheId(nextFiche?.id ?? null)
      }
    } else if ((cats ?? []).length > 0) {
      setForm(f => ({ ...f, category_id: cats![0].id }))
    }
    setLoading(false)
  }, [ficheId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load() }, [load])

  const pdfUnlockAt = pdfRegenerateUnlockAt(lastGeneratedAt)
  const pdfLocked = pdfUnlockAt > now

  useEffect(() => {
    if (!pdfLocked) return
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [pdfLocked])

  function addKeyPoint() {
    setForm(f => ({ ...f, key_points: [...f.key_points, ''] }))
  }
  function updateKeyPoint(i: number, value: string) {
    setForm(f => ({ ...f, key_points: f.key_points.map((p, idx) => idx === i ? value : p) }))
  }
  function removeKeyPoint(i: number) {
    setForm(f => ({ ...f, key_points: f.key_points.filter((_, idx) => idx !== i) }))
  }
  function moveKeyPoint(i: number, dir: -1 | 1) {
    setForm(f => {
      const points = [...f.key_points]
      const j = i + dir
      if (j < 0 || j >= points.length) return f
      ;[points[i], points[j]] = [points[j], points[i]]
      return { ...f, key_points: points }
    })
  }

  async function save(): Promise<string | null> {
    setError('')
    if (!form.category_id || !form.title.trim()) {
      setError('Catégorie et titre sont requis.')
      return null
    }
    const payload = { ...form, key_points: form.key_points.filter(p => p.trim() !== '') }
    const url = ficheId ? `/api/super-admin/fiches/${ficheId}` : '/api/super-admin/fiches'
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) { setError(data.error || 'Erreur lors de l\'enregistrement'); return null }
    return ficheId ?? data.id
  }

  async function handleSave() {
    setSaving('save')
    const id = await save()
    setSaving(null)
    if (!id) return
    setSuccess(true)
    setTimeout(() => setSuccess(false), 2500)
    if (!ficheId) router.push(`/dashboard/super-admin/fiches/${id}`)
  }

  async function handleSaveAndPdf() {
    setSaving('save-pdf')
    const id = await save()
    if (!id) { setSaving(null); return }
    if (form.status === 'brouillon') {
      setError('Passez la fiche en statut « Prête » ou « Envoyée » pour générer le PDF.')
      setSaving(null)
      if (!ficheId) router.push(`/dashboard/super-admin/fiches/${id}`)
      return
    }
    if (pdfLocked) {
      setError(`Régénérable dans ${formatRegenerateRemaining(pdfUnlockAt - now)} — le PDF a déjà été généré récemment.`)
      setSaving(null)
      return
    }
    const result = await downloadFichePdf(id)
    setSaving(null)
    if (!result.ok) { setError(result.error); return }
    setLastGeneratedAt(result.lastGeneratedAt)
    setNow(Date.now())
    if (!ficheId) router.push(`/dashboard/super-admin/fiches/${id}`)
  }

  async function handleSaveAndNext() {
    if (!nextFicheId) return
    setSaving('save-next')
    const id = await save()
    setSaving(null)
    if (!id) return
    router.push(`/dashboard/super-admin/fiches/${nextFicheId}`)
  }

  const activeCategory = categories.find(c => c.id === form.category_id)

  if (loading) return <p className="text-gray-500 text-sm">Chargement...</p>

  return (
    <div className="max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <Link href="/dashboard/super-admin/fiches" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-orange transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Retour aux fiches
        </Link>
        {ficheId && nextFicheId && (
          <button type="button" onClick={handleSaveAndNext} disabled={saving !== null}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand-orange transition-colors disabled:opacity-50">
            {saving === 'save-next' ? 'Enregistrement...' : 'Fiche suivante'}
            <ArrowRight className="w-4 h-4" />
          </button>
        )}
      </div>
      <div className="mb-8 flex items-center gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{ficheId ? 'Modifier la fiche' : 'Nouvelle fiche'}</h1>
          <p className="text-gray-500 text-sm mt-1">{numero ? `Fiche ${formatNumero(numero)}` : 'Le numéro sera attribué à l\'enregistrement'}</p>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-xl px-4 py-3 mb-6">Fiche enregistrée avec succès.</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">Informations générales</h2>
            <div>
              <label className={labelClass}>Titre *</label>
              <input type="text" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputClass} placeholder="Trouver son client idéal" />
            </div>
            <div>
              <label className={labelClass}>Pitch (résumé en une phrase)</label>
              <input type="text" value={form.pitch} onChange={e => setForm(f => ({ ...f, pitch: e.target.value }))} className={inputClass} placeholder="Affiché dans la liste des fiches" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>Catégorie *</label>
                <select value={form.category_id} onChange={e => setForm(f => ({ ...f, category_id: e.target.value }))} className={inputClass}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelClass}>Statut</label>
                <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))} className={inputClass}>
                  <option value="brouillon">Brouillon</option>
                  <option value="prete">Prête</option>
                  <option value="envoyee">Envoyée</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Sous-titre / accroche</label>
              <input type="text" value={form.subtitle} onChange={e => setForm(f => ({ ...f, subtitle: e.target.value }))} className={inputClass} />
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
            <h2 className="font-semibold text-gray-900 text-sm mb-1">Contenu</h2>
            <div>
              <label className={labelClass}>Pourquoi c&apos;est important</label>
              <textarea value={form.why_it_matters} onChange={e => setForm(f => ({ ...f, why_it_matters: e.target.value }))} rows={3} className={textareaClass} />
            </div>

            <div>
              <label className={labelClass}>Points clés</label>
              <div className="space-y-2">
                {form.key_points.map((point, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input type="text" value={point} onChange={e => updateKeyPoint(i, e.target.value)} className={inputClass} placeholder={`Point clé ${i + 1}`} />
                    <button type="button" onClick={() => moveKeyPoint(i, -1)} disabled={i === 0} className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-orange disabled:opacity-30 transition-colors shrink-0">
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => moveKeyPoint(i, 1)} disabled={i === form.key_points.length - 1} className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-brand-orange disabled:opacity-30 transition-colors shrink-0">
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                    <button type="button" onClick={() => removeKeyPoint(i)} className="p-2 rounded-lg border border-gray-200 text-gray-400 hover:text-red-500 transition-colors shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
              <button type="button" onClick={addKeyPoint}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-brand-orange hover:text-brand-orange-dark transition-colors">
                <Plus className="w-3.5 h-3.5" />
                Ajouter un point clé
              </button>
            </div>

            <div>
              <label className={labelClass}>Exemple concret</label>
              <textarea value={form.example} onChange={e => setForm(f => ({ ...f, example: e.target.value }))} rows={3} className={textareaClass} />
            </div>
            <div>
              <label className={labelClass}>Erreur fréquente</label>
              <textarea value={form.common_mistake} onChange={e => setForm(f => ({ ...f, common_mistake: e.target.value }))} rows={2} className={textareaClass} />
            </div>
            <div>
              <label className={labelClass}>Action à faire maintenant</label>
              <textarea value={form.action_step} onChange={e => setForm(f => ({ ...f, action_step: e.target.value }))} rows={2} className={textareaClass} />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button type="button" onClick={handleSave} disabled={saving !== null}
              className="bg-brand-orange hover:bg-brand-orange-dark text-white text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50">
              {saving === 'save' ? 'Enregistrement...' : 'Enregistrer'}
            </button>
            <button type="button" onClick={handleSaveAndPdf} disabled={saving !== null || (pdfLocked && form.status !== 'brouillon')}
              className="inline-flex items-center gap-1.5 bg-white border border-gray-200 hover:border-brand-orange hover:text-brand-orange text-gray-700 text-sm font-semibold rounded-xl px-5 py-2.5 transition-colors disabled:opacity-50">
              <Download className="w-4 h-4" />
              {saving === 'save-pdf'
                ? 'Génération...'
                : pdfLocked && form.status !== 'brouillon'
                  ? `Régénérable dans ${formatRegenerateRemaining(pdfUnlockAt - now)}`
                  : 'Enregistrer et générer PDF'}
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:col-span-1">
          <div className="sticky top-6">
            <p className="text-[10px] text-gray-400 mb-2 font-medium uppercase tracking-wider">Aperçu de la fiche</p>
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden relative">
              {activeCategory && <div className="absolute top-0 left-0 w-1 h-full" style={{ backgroundColor: activeCategory.color }} />}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold text-gray-400">{numero ? formatNumero(numero) : '#—'}</span>
                  <FicheStatusBadge status={form.status} />
                </div>
                {activeCategory && (
                  <span className="text-[11px] font-semibold" style={{ color: activeCategory.color }}>
                    {activeCategory.code} · {activeCategory.name}
                  </span>
                )}
                <h3 className="text-base font-bold text-gray-900 mt-1.5 leading-snug">{form.title || 'Titre de la fiche'}</h3>
                {form.subtitle && <p className="text-sm text-gray-500 mt-1 leading-snug">{form.subtitle}</p>}

                {form.why_it_matters && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-brand-orange uppercase tracking-wider mb-1">Pourquoi c&apos;est important</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{form.why_it_matters}</p>
                  </div>
                )}

                {form.key_points.filter(p => p.trim()).length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-brand-orange uppercase tracking-wider mb-1.5">Points clés</p>
                    <ul className="space-y-1">
                      {form.key_points.filter(p => p.trim()).map((p, i) => (
                        <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5">
                          <span className="w-1 h-1 rounded-full bg-brand-orange mt-1.5 shrink-0" />
                          {p}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {form.example && (
                  <div className="mt-4 bg-gray-50 rounded-xl p-3">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Exemple concret</p>
                    <p className="text-xs text-gray-600 leading-relaxed">{form.example}</p>
                  </div>
                )}

                {form.common_mistake && (
                  <div className="mt-4 bg-red-50 border-l-2 border-red-500 rounded-r-xl p-3">
                    <p className="text-[10px] font-bold text-red-600 uppercase tracking-wider mb-1">Erreur fréquente</p>
                    <p className="text-xs text-red-700 leading-relaxed">{form.common_mistake}</p>
                  </div>
                )}

                {form.action_step && (
                  <div className="mt-3 bg-green-50 border-l-2 border-green-600 rounded-r-xl p-3">
                    <p className="text-[10px] font-bold text-green-700 uppercase tracking-wider mb-1">À faire maintenant</p>
                    <p className="text-xs text-green-800 leading-relaxed">{form.action_step}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
