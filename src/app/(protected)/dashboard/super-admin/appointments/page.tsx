'use client'

import { useEffect, useState, useCallback } from 'react'
import { Calendar, Clock, Plus, Check, X, RefreshCw, Trash2 } from 'lucide-react'

interface Appointment { id: string; name: string; phone: string; subject: string; requested_date: string; requested_time: string; status: string; created_at: string }
interface BlockedDate { date: string }
interface RecurringSlot { id: string; weekday: number; start_time: string; duration_minutes: number; is_active: boolean }

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
const iCls = 'bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-900 focus:outline-none focus:border-brand-orange focus:ring-1 focus:ring-brand-orange/20 transition-colors'

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  pending:   { label: 'En attente', color: '#D97706', bg: '#FFFBEB' },
  confirmed: { label: 'Confirmé',   color: '#059669', bg: '#F0FDF4' },
  done:      { label: 'Terminé',    color: '#6B7280', bg: '#F9FAFB' },
  cancelled: { label: 'Annulé',     color: '#DC2626', bg: '#FEF2F2' },
}

function formatDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('fr-SN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingAppts, setLoadingAppts] = useState(true)

  // Blocked dates state
  const [blockedDates, setBlockedDates] = useState<BlockedDate[]>([])
  const [newBlockedDate, setNewBlockedDate] = useState('')
  const [savingAvail, setSavingAvail] = useState(false)
  const [savedAvail, setSavedAvail] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [loadingAvail, setLoadingAvail] = useState(true)

  // Recurring slots state
  const [recurringSlots, setRecurringSlots] = useState<RecurringSlot[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [openDayForm, setOpenDayForm] = useState<number | null>(null)
  const [newSlotTime, setNewSlotTime] = useState('09:00')
  const [newSlotDuration, setNewSlotDuration] = useState(15)
  const [addingSlot, setAddingSlot] = useState(false)

  const today = new Date().toISOString().split('T')[0]

  const loadAppointments = useCallback(async () => {
    setLoadingAppts(true)
    const res = await fetch('/api/appointment-requests').then(r => r.json()).catch(() => ({ appointments: [] }))
    setAppointments(res.appointments ?? [])
    setLoadingAppts(false)
  }, [])

  const loadAvailability = useCallback(async () => {
    const res = await fetch('/api/availability-settings').then(r => r.json()).catch(() => null)
    if (res?.blocked_dates) setBlockedDates(res.blocked_dates.map((d: string) => ({ date: d })))
    setLoadingAvail(false)
  }, [])

  const loadRecurringSlots = useCallback(async () => {
    setLoadingSlots(true)
    const res = await fetch('/api/super-admin/recurring-slots').then(r => r.json()).catch(() => ({ slots: [] }))
    setRecurringSlots(res.slots ?? [])
    setLoadingSlots(false)
  }, [])

  useEffect(() => {
    loadAppointments()
    loadAvailability()
    loadRecurringSlots()
  }, [loadAppointments, loadAvailability, loadRecurringSlots])

  async function saveAvailability() {
    setSavingAvail(true)
    setSaveError('')
    try {
    const res = await fetch('/api/availability-settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocked_dates: blockedDates.map(b => b.date),
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setSaveError(data.error ?? 'Erreur lors de la sauvegarde')
      setSavingAvail(false)
      return
    }
    setSavedAvail(true)
    setSavingAvail(false)
    setTimeout(() => setSavedAvail(false), 2500)
    } catch {
      setSaveError('Erreur réseau. Veuillez réessayer.')
      setSavingAvail(false)
    }
  }

  function addBlockedDate() {
    if (!newBlockedDate || blockedDates.some(b => b.date === newBlockedDate)) return
    setBlockedDates(prev => [...prev, { date: newBlockedDate }].sort((a, b) => a.date.localeCompare(b.date)))
    setNewBlockedDate('')
  }

  function removeBlockedDate(date: string) {
    setBlockedDates(prev => prev.filter(b => b.date !== date))
  }

  async function addRecurringSlot(weekday: number) {
    if (!newSlotTime || !newSlotDuration) return
    setAddingSlot(true)
    try {
      const res = await fetch('/api/super-admin/recurring-slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekday, start_time: newSlotTime, duration_minutes: newSlotDuration }),
      })
      if (res.ok) {
        await loadRecurringSlots()
        setOpenDayForm(null)
        setNewSlotTime('09:00')
        setNewSlotDuration(15)
      } else {
        const data = await res.json().catch(() => ({}))
        alert(data.error || 'Erreur lors de l\'ajout du créneau')
      }
    } finally {
      setAddingSlot(false)
    }
  }

  async function removeRecurringSlot(id: string) {
    await fetch('/api/super-admin/recurring-slots', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    await loadRecurringSlots()
  }

  async function updateApptStatus(appt: Appointment, status: string) {
    // Open synchronously, before any await, so the browser doesn't block the popup
    if (status === 'confirmed') {
      const msg = `Bonjour ${appt.name}, votre rendez-vous TerangaSpot${appt.subject ? ` (${appt.subject})` : ''} du ${formatDate(appt.requested_date)} à ${appt.requested_time.slice(0, 5)} est confirmé. À très bientôt !`
      window.open(`https://wa.me/${appt.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank')
    }
    await fetch('/api/appointment-requests', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: appt.id, status }),
    })
    await loadAppointments()
  }

  const sortedAppts = [...appointments].sort((a, b) => a.requested_date.localeCompare(b.requested_date))

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
          <p className="text-gray-500 text-sm mt-1">Disponibilités et demandes reçues</p>
        </div>
      </div>

      {/* ── SECTION 1 : Créneaux ── */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
        <h2 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-brand-orange" />
          Mes créneaux
        </h2>
        <p className="text-xs text-gray-400 mb-5">Ajoutez des créneaux individuels (jour, heure, durée). Ils se répètent chaque semaine et disparaissent automatiquement une fois réservés.</p>

        {loadingSlots ? (
          <p className="text-sm text-gray-400">Chargement…</p>
        ) : (
          <div className="space-y-4">
            {DAYS.map((day, dayIndex) => {
              const daySlots = recurringSlots.filter(s => s.weekday === dayIndex).sort((a, b) => a.start_time.localeCompare(b.start_time))
              return (
                <div key={day} className="border border-gray-100 rounded-xl p-4">
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <p className="text-sm font-semibold text-gray-900">{day}</p>
                    <button type="button"
                      onClick={() => setOpenDayForm(openDayForm === dayIndex ? null : dayIndex)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-orange hover:text-brand-orange-dark transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Ajouter un créneau
                    </button>
                  </div>

                  {daySlots.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {daySlots.map(s => (
                        <div key={s.id} className="flex items-center gap-1.5 bg-orange-50 border border-orange-100 text-brand-orange text-xs font-medium px-3 py-1.5 rounded-lg">
                          {s.start_time.slice(0, 5)} · {s.duration_minutes} min
                          <button onClick={() => removeRecurringSlot(s.id)} className="hover:text-red-600 ml-1">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  {daySlots.length === 0 && openDayForm !== dayIndex && (
                    <p className="text-xs text-gray-400">Aucun créneau ce jour</p>
                  )}

                  {openDayForm === dayIndex && (
                    <div className="flex flex-wrap items-end gap-2 bg-gray-50 rounded-lg p-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Heure</label>
                        <input type="time" value={newSlotTime} onChange={e => setNewSlotTime(e.target.value)} className={iCls} />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Durée</label>
                        <select value={newSlotDuration} onChange={e => setNewSlotDuration(Number(e.target.value))} className={iCls}>
                          {[15, 20, 30, 45, 60].map(d => <option key={d} value={d}>{d} min</option>)}
                        </select>
                      </div>
                      <button type="button" onClick={() => addRecurringSlot(dayIndex)} disabled={addingSlot}
                        className="inline-flex items-center gap-1.5 bg-brand-orange text-white text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-brand-orange-dark transition-colors disabled:opacity-50">
                        <Check className="w-4 h-4" /> Confirmer
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Blocked dates */}
        <div className="mt-6 pt-6 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-500 mb-2">Jours bloqués (ponctuel — ex. jours fériés)</label>
          {loadingAvail ? (
            <p className="text-sm text-gray-400">Chargement…</p>
          ) : (
            <>
              <div className="flex gap-2 mb-3">
                <input type="date" value={newBlockedDate} min={today}
                  onChange={e => setNewBlockedDate(e.target.value)}
                  className={iCls} />
                <button type="button" onClick={addBlockedDate}
                  className="inline-flex items-center gap-1.5 bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-xl hover:bg-gray-800 transition-colors">
                  <Plus className="w-4 h-4" /> Ajouter
                </button>
              </div>
              {blockedDates.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {blockedDates.map(b => (
                    <div key={b.date} className="flex items-center gap-1.5 bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-3 py-1.5 rounded-lg">
                      {formatDate(b.date)}
                      <button onClick={() => removeBlockedDate(b.date)} className="hover:text-red-800 ml-1">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {saveError && <p className="text-sm text-red-500 bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-3">{saveError}</p>}
              <button onClick={saveAvailability} disabled={savingAvail}
                className="inline-flex items-center gap-2 bg-gray-900 text-white text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-50">
                {savedAvail ? <><Check className="w-4 h-4" /> Enregistré</> : savingAvail ? 'Enregistrement…' : 'Enregistrer les jours bloqués'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── SECTION 2 : Rendez-vous reçus ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-brand-orange" />
            Rendez-vous reçus ({appointments.length})
          </h2>
          <button onClick={loadAppointments} className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className={`w-4 h-4 text-gray-500 ${loadingAppts ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {loadingAppts ? (
          <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center text-sm text-gray-400">Chargement…</div>
        ) : sortedAppts.length === 0 ? (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl p-10 text-center">
            <p className="text-sm text-gray-400">Aucune demande de rendez-vous pour l&apos;instant</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
            <div className="hidden sm:grid grid-cols-5 gap-4 px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <span>Nom</span><span>Téléphone</span><span>Sujet</span><span>Date / Heure</span><span>Actions</span>
            </div>
            <div className="divide-y divide-gray-100">
              {sortedAppts.map(a => {
                const st = STATUS_COLORS[a.status] ?? { label: a.status, color: '#6B7280', bg: '#F9FAFB' }
                return (
                  <div key={a.id} className="px-5 py-4 grid grid-cols-1 sm:grid-cols-5 gap-3 items-center">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{a.name}</p>
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
                    </div>
                    <p className="text-sm text-gray-600">{a.phone}</p>
                    <p className="text-sm text-gray-600 truncate">{a.subject}</p>
                    <p className="text-sm font-medium text-brand-orange">
                      {formatDate(a.requested_date)}<br />
                      <span className="text-xs text-gray-400">{a.requested_time?.slice(0, 5)}</span>
                    </p>
                    <div className="flex gap-1.5 flex-wrap">
                      {a.status === 'pending' && (
                        <button onClick={() => updateApptStatus(a, 'confirmed')}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors">
                          Confirmer
                        </button>
                      )}
                      {a.status === 'confirmed' && (
                        <button onClick={() => updateApptStatus(a, 'done')}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors">
                          Terminé
                        </button>
                      )}
                      {(a.status === 'pending' || a.status === 'confirmed') && (
                        <button onClick={() => updateApptStatus(a, 'cancelled')}
                          className="text-xs font-medium px-2.5 py-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors">
                          Annuler
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
