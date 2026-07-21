'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'
import { Calendar, Check, ArrowLeft, Clock } from 'lucide-react'

const SUBJECTS = [
  'Découverte de TerangaSpot',
  'Création de ma boutique',
  'Question sur les tarifs',
  'Question technique',
  'Autre',
]

const inputClass = 'w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-violet focus:ring-1 focus:ring-brand-violet/20 bg-white transition-colors'
const labelClass = 'block text-xs font-medium text-gray-500 mb-1.5'

interface Slot {
  id: string
  date: string
  start_time: string
  label: string | null
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('fr-SN', { weekday: 'long', day: 'numeric', month: 'long' })
}

export default function RendezVousPage() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [slotsLoading, setSlotsLoading] = useState(true)
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null)
  const [form, setForm] = useState({ name: '', phone: '', subject: SUBJECTS[0] })
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [supportWhatsapp, setSupportWhatsapp] = useState('221774739266')

  useEffect(() => {
    fetch('/api/rdv-slots')
      .then(r => r.json())
      .then(d => { setSlots(d.slots ?? []); setSlotsLoading(false) })
      .catch(() => setSlotsLoading(false))
  }, [])

  useEffect(() => {
    fetch('/api/platform-settings')
      .then(r => r.json())
      .then(d => { if (d.support_whatsapp) setSupportWhatsapp(d.support_whatsapp) })
      .catch(() => {})
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedSlot) { setError('Veuillez choisir un créneau.'); return }
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/appointment-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          subject: form.subject,
          requested_date: selectedSlot.date,
          requested_time: selectedSlot.start_time,
          slot_id: selectedSlot.id,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Erreur')
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur est survenue')
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-50 border border-green-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Demande envoyée !</h1>
          <p className="text-gray-500 mb-2">
            Votre créneau <strong>{selectedSlot && formatDate(selectedSlot.date)}</strong> à <strong>{selectedSlot?.start_time.slice(0, 5)}</strong> est réservé.
          </p>
          <p className="text-gray-400 text-sm mb-6">Nous vous contacterons pour confirmer.</p>
          <Link href="/" className="text-brand-violet hover:text-brand-violet-dark text-sm font-medium transition-colors">
            Retour à l&apos;accueil
          </Link>
        </div>
      </div>
    )
  }

  // Group slots by date
  const slotsByDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-white">
      <header className="px-6 py-5 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <Link href="/"><Logo textClassName="font-bold text-xl" textStyle={{ color: '#111111' }} /></Link>
      </header>

      <div className="max-w-xl mx-auto px-4 py-12">
        <Link href="/pour-les-boutiques" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand-violet transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          Retour
        </Link>

        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: 'rgba(124,58,237,0.1)' }}>
            <Calendar className="w-5 h-5 text-brand-violet" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Réserver un appel découverte</h1>
            <p className="text-sm text-gray-500 mt-0.5">Discutons de votre projet en 15 minutes</p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3 mb-6">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Step 1: Personal info */}
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Votre nom *</label>
              <input type="text" required value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Aminata Diallo" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Votre téléphone / WhatsApp *</label>
              <input type="tel" required value={form.phone}
                onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="+221 77 000 00 00" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Sujet *</label>
              <select required value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className={inputClass}>
                {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Step 2: Slot picker */}
          <div>
            <label className={labelClass}>Choisissez un créneau *</label>
            {slotsLoading ? (
              <p className="text-sm text-gray-400">Chargement des créneaux...</p>
            ) : Object.keys(slotsByDate).length === 0 ? (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-4 text-sm text-amber-700">
                Aucun créneau disponible pour le moment. Écrivez-nous directement sur{' '}
                <a href={`https://wa.me/${supportWhatsapp.replace(/\D/g, '')}`} className="font-semibold underline">WhatsApp</a>.
              </div>
            ) : (
              <div className="space-y-4">
                {Object.entries(slotsByDate).map(([date, dateSlots]) => (
                  <div key={date}>
                    <p className="text-xs font-semibold text-gray-700 mb-2 capitalize">{formatDate(date)}</p>
                    <div className="flex flex-wrap gap-2">
                      {dateSlots.map(slot => (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => setSelectedSlot(slot)}
                          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all"
                          style={{
                            borderColor: selectedSlot?.id === slot.id ? '#7C3AED' : '#E5E7EB',
                            backgroundColor: selectedSlot?.id === slot.id ? 'rgba(124,58,237,0.07)' : '#FFFFFF',
                            color: selectedSlot?.id === slot.id ? '#7C3AED' : '#374151',
                          }}
                        >
                          <Clock className="w-3.5 h-3.5" />
                          {slot.start_time.slice(0, 5)}
                          {slot.label && <span className="text-xs opacity-70">· {slot.label}</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || !selectedSlot}
            className="w-full py-3.5 rounded-xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            style={{ backgroundColor: '#7C3AED' }}
          >
            {loading ? 'Envoi en cours...' : 'Confirmer le rendez-vous'}
          </button>
        </form>
      </div>
    </div>
  )
}
