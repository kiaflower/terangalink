'use client'

import { useEffect, useState } from 'react'
import { CalendarClock, Clock, CheckCircle2 } from 'lucide-react'

interface Slot {
  id: string
  date: string
  start_time: string
  end_time: string
}

function formatDateLabel(date: string): string {
  return new Intl.DateTimeFormat('fr-SN', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date(date))
}

function formatTime(time: string): string {
  return time.slice(0, 5)
}

export function BookingWidget() {
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [ownerName, setOwnerName] = useState('')
  const [boutiqueName, setBoutiqueName] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/slots')
      .then(r => r.json())
      .then(data => setSlots(Array.isArray(data) ? data : []))
      .finally(() => setLoading(false))
  }, [])

  const grouped = slots.reduce<Record<string, Slot[]>>((acc, slot) => {
    acc[slot.date] = acc[slot.date] ?? []
    acc[slot.date].push(slot)
    return acc
  }, {})

  async function submit() {
    if (!selected || !ownerName || !boutiqueName) {
      setError('Veuillez remplir tous les champs requis.')
      return
    }
    setSubmitting(true)
    setError(null)

    const isEmail = contact.includes('@')
    const res = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: selected.id,
        boutique_name: boutiqueName,
        owner_name: ownerName,
        email: isEmail ? contact : null,
        whatsapp: !isEmail ? contact : null,
      }),
    })

    setSubmitting(false)
    if (!res.ok) {
      const data = await res.json()
      setError(data.error || 'Erreur lors de la réservation.')
      return
    }
    setDone(true)
  }

  if (done) {
    return (
      <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <CheckCircle2 className="w-10 h-10 mx-auto mb-3 text-brand-violet" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Rendez-vous confirmé !</h3>
        <p className="text-sm text-gray-500">
          Nous vous contacterons le {selected && formatDateLabel(selected.date)} à {selected && formatTime(selected.start_time)}.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-2xl p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-2 mb-4">
        <CalendarClock className="w-5 h-5 text-brand-violet" />
        <h3 className="text-base font-bold text-gray-900">Choisissez un créneau</h3>
      </div>

      {loading ? (
        <p className="text-sm text-gray-400">Chargement des créneaux...</p>
      ) : Object.keys(grouped).length === 0 ? (
        <p className="text-sm text-gray-400">Aucun créneau disponible pour le moment.</p>
      ) : (
        <div className="space-y-4 mb-6">
          {Object.entries(grouped).map(([date, daySlots]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-gray-500 capitalize mb-2">{formatDateLabel(date)}</p>
              <div className="flex flex-wrap gap-2">
                {daySlots.map(slot => (
                  <button
                    key={slot.id}
                    onClick={() => setSelected(slot)}
                    className={`rounded-xl border px-4 py-2 text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      selected?.id === slot.id
                        ? 'bg-brand-violet text-white border-brand-violet'
                        : 'border-gray-200 text-gray-700 hover:border-brand-violet'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {selected && (
        <div className="space-y-3 border-t border-gray-100 pt-4">
          <input
            value={boutiqueName}
            onChange={e => setBoutiqueName(e.target.value)}
            placeholder="Nom de votre boutique *"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-violet"
          />
          <input
            value={ownerName}
            onChange={e => setOwnerName(e.target.value)}
            placeholder="Votre nom *"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-violet"
          />
          <input
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder="Email ou numéro WhatsApp"
            className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand-violet"
          />
          {error && <p className="text-xs text-red-500">{error}</p>}
          <button
            onClick={submit}
            disabled={submitting}
            className="w-full bg-brand-violet text-white py-3 rounded-xl font-semibold hover:bg-brand-violet-dark transition-colors disabled:opacity-50"
          >
            {submitting ? 'Réservation...' : 'Confirmer le rendez-vous'}
          </button>
        </div>
      )}
    </div>
  )
}
