'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Plus, Trash2, X,
  MessageCircle, Check, CalendarDays, Clock, Loader2,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Slot {
  id: string
  date: string
  start_time: string
  end_time: string
  is_booked: boolean
  is_blocked: boolean
}

type AppointmentStatus = 'upcoming' | 'done' | 'cancelled'

interface Appointment {
  id: string
  slot_id: string | null
  restaurant_name: string
  owner_name: string
  email: string | null
  whatsapp: string | null
  status: AppointmentStatus
  admin_notes: string | null
  created_at: string
  slot?: Slot | null
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function startOfWeek(d: Date): Date {
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  const r = new Date(d)
  r.setDate(r.getDate() + diff)
  r.setHours(0, 0, 0, 0)
  return r
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim']
const MONTHS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

function fmtDateTime(slot: Slot) {
  return `${fmtDate(slot.date)} · ${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`
}

const STATUS_CONFIG: Record<AppointmentStatus, { label: string; color: string; bg: string }> = {
  upcoming:  { label: 'À venir',  color: '#EA580C', bg: '#FFF7ED' },
  done:      { label: 'Terminé',  color: '#16A34A', bg: '#F0FDF4' },
  cancelled: { label: 'Annulé',   color: '#DC2626', bg: '#FEF2F2' },
}

const API = '/api/super-admin/disponibilites'

// ─── Composant principal ──────────────────────────────────────────────────────

export default function DisponibilitesPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => startOfWeek(new Date()))
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const [slots, setSlots] = useState<Slot[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [loadingSlots, setLoadingSlots] = useState(true)
  const [loadingAppts, setLoadingAppts] = useState(true)

  const [addingFor, setAddingFor] = useState<string | null>(null)
  const [newStart, setNewStart] = useState('09:00')
  const [newEnd, setNewEnd] = useState('10:00')
  const [saving, setSaving] = useState(false)

  const [selected, setSelected] = useState<Appointment | null>(null)
  const [notes, setNotes] = useState('')
  const [savingNotes, setSavingNotes] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  const loadSlots = useCallback(async () => {
    setLoadingSlots(true)
    const from = isoDate(weekDays[0])
    const to = isoDate(weekDays[6])
    const res = await fetch(`${API}?from=${from}&to=${to}`)
    const data = await res.json()
    setSlots(Array.isArray(data) ? data : [])
    setLoadingSlots(false)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart])

  const loadAppointments = useCallback(async () => {
    setLoadingAppts(true)
    const res = await fetch(`${API}?type=appointments`)
    const data = await res.json()
    setAppointments(Array.isArray(data) ? data : [])
    setLoadingAppts(false)
  }, [])

  useEffect(() => { loadSlots() }, [loadSlots])
  useEffect(() => { loadAppointments() }, [loadAppointments])

  // ── Ajout créneau ────────────────────────────────────────────────────────

  async function handleAddSlot(date: string) {
    if (!newStart || !newEnd || newEnd <= newStart) return
    setSaving(true)
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, start_time: newStart, end_time: newEnd, is_booked: false, is_blocked: false }),
    })
    setAddingFor(null)
    await loadSlots()
    setSaving(false)
  }

  async function handleBlockDay(date: string) {
    setSaving(true)
    await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date, start_time: '00:00', end_time: '23:59', is_booked: false, is_blocked: true }),
    })
    await loadSlots()
    setSaving(false)
  }

  async function handleDeleteSlot(id: string) {
    await fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setSlots(prev => prev.filter(s => s.id !== id))
  }

  // ── Actions rendez-vous ───────────────────────────────────────────────────

  async function handleUpdateStatus(status: AppointmentStatus) {
    if (!selected) return
    setUpdatingStatus(true)
    await fetch(API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, table: 'appointments', status }),
    })
    setAppointments(prev => prev.map(a => a.id === selected.id ? { ...a, status } : a))
    setSelected(s => s ? { ...s, status } : s)
    setUpdatingStatus(false)
  }

  async function handleCancelWithSlot(action: 'restore' | 'delete') {
    if (!selected) return
    setUpdatingStatus(true)
    setShowCancelModal(false)
    const body: Record<string, unknown> = {
      id: selected.id,
      table: 'appointments',
      status: 'cancelled',
    }
    if (selected.slot_id) {
      if (action === 'restore') body.restore_slot = true
      if (action === 'delete') body.delete_slot = true
      body.slot_id = selected.slot_id
    }
    await fetch(API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    // Mise à jour locale immédiate des appointments
    setAppointments(prev => prev.map(a => a.id === selected.id ? { ...a, status: 'cancelled' } : a))
    setSelected(s => s ? { ...s, status: 'cancelled' } : s)
    // Reload des créneaux pour refléter is_booked mis à jour
    await loadSlots()
    setUpdatingStatus(false)
  }

  async function handleSaveNotes() {
    if (!selected) return
    setSavingNotes(true)
    await fetch(API, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: selected.id, table: 'appointments', admin_notes: notes }),
    })
    setAppointments(prev => prev.map(a => a.id === selected.id ? { ...a, admin_notes: notes } : a))
    setSavingNotes(false)
  }

  function openAppt(appt: Appointment) {
    setSelected(appt)
    setNotes(appt.admin_notes ?? '')
  }

  const weekLabel = (() => {
    const d0 = weekDays[0], d6 = weekDays[6]
    return `${d0.getDate()} – ${d6.getDate()} ${MONTHS[d6.getMonth()]} ${d6.getFullYear()}`
  })()

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="p-6 sm:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Disponibilités & Rendez-vous</h1>
        <p className="text-gray-500 text-sm mt-1">Gérez vos créneaux et suivez les rendez-vous restaurants</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ══ SECTION GAUCHE — Agenda ══════════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
          <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
            <button onClick={() => setWeekStart(d => addDays(d, -7))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-500" />
            </button>
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#9CA3AF' }}>Semaine</p>
              <p className="text-sm font-semibold" style={{ color: '#111111' }}>{weekLabel}</p>
            </div>
            <button onClick={() => setWeekStart(d => addDays(d, 7))}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {loadingSlots ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {weekDays.map((day, i) => {
                const dateStr = isoDate(day)
                const daySlots = slots.filter(s => s.date === dateStr)
                const isToday = isoDate(new Date()) === dateStr
                const isBlocked = daySlots.some(s => s.is_blocked)

                return (
                  <div key={dateStr} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${isToday ? 'text-white' : 'text-gray-600'}`}
                          style={{ backgroundColor: isToday ? '#F97316' : '#F3F4F6' }}>
                          {day.getDate()}
                        </div>
                        <span className="text-sm font-semibold" style={{ color: '#374151' }}>{JOURS[i]}</span>
                        {isBlocked && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                            Bloqué
                          </span>
                        )}
                      </div>
                      {!isBlocked && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setAddingFor(addingFor === dateStr ? null : dateStr); setNewStart('09:00'); setNewEnd('10:00') }}
                            className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors hover:bg-orange-50"
                            style={{ color: '#F97316', border: '1px solid #FED7AA' }}>
                            <Plus className="w-3 h-3" />Créneau
                          </button>
                          <button
                            onClick={() => handleBlockDay(dateStr)}
                            className="text-xs px-2.5 py-1.5 rounded-lg font-medium transition-colors hover:bg-red-50"
                            style={{ color: '#DC2626', border: '1px solid #FECACA' }}>
                            Bloquer
                          </button>
                        </div>
                      )}
                    </div>

                    {addingFor === dateStr && (
                      <div className="mb-3 p-3 rounded-xl flex items-center gap-2 flex-wrap"
                        style={{ backgroundColor: '#FFF7ED', border: '1px solid #FED7AA' }}>
                        <div className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-orange-400" />
                          <input type="time" value={newStart} onChange={e => setNewStart(e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                            style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111111' }} />
                          <span className="text-xs text-gray-400">→</span>
                          <input type="time" value={newEnd} onChange={e => setNewEnd(e.target.value)}
                            className="text-xs px-2 py-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
                            style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF', color: '#111111' }} />
                        </div>
                        <button onClick={() => handleAddSlot(dateStr)} disabled={saving}
                          className="text-xs px-3 py-1.5 rounded-lg font-semibold text-white disabled:opacity-50"
                          style={{ backgroundColor: '#F97316' }}>
                          {saving ? '...' : 'Ajouter'}
                        </button>
                        <button onClick={() => setAddingFor(null)} className="text-gray-400 hover:text-gray-600">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      {daySlots.length === 0 ? (
                        <p className="text-xs text-gray-300 pl-1">Aucun créneau</p>
                      ) : daySlots.map(slot => {
                        // Trouver le RDV actif lié à ce créneau (pas annulé)
                        const linkedAppt = appointments.find(
                          a => a.slot_id === slot.id && a.status !== 'cancelled'
                        )
                        const isPending = linkedAppt?.status === 'upcoming'
                        const isConfirmed = linkedAppt?.status === 'done'
                        const isEffectivelyBooked = !!linkedAppt // a un RDV non annulé

                        return (
                        <div key={slot.id} className="flex items-center justify-between px-3 py-2 rounded-xl"
                          style={{
                            backgroundColor: slot.is_blocked ? '#FEF2F2'
                              : isConfirmed ? '#F0FDF4'
                              : isPending ? '#FFF7ED'
                              : '#F9FAFB',
                            border: `1px solid ${slot.is_blocked ? '#FECACA'
                              : isConfirmed ? '#BBF7D0'
                              : isPending ? '#FED7AA'
                              : '#E5E7EB'}`,
                          }}>
                          <div className="flex items-center gap-2">
                            <Clock className="w-3 h-3 text-gray-400" />
                            <span className="text-xs font-medium" style={{ color: '#374151' }}>
                              {slot.is_blocked ? 'Journée bloquée' : `${slot.start_time.slice(0, 5)} – ${slot.end_time.slice(0, 5)}`}
                            </span>
                          </div>
                          {isConfirmed ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#BBF7D0', color: '#16A34A' }}>
                              Confirmé
                            </span>
                          ) : isPending ? (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: '#FED7AA', color: '#EA580C' }}>
                              En attente
                            </span>
                          ) : (
                            <button onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1 rounded-lg hover:bg-red-50 transition-colors text-gray-300 hover:text-red-400">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ══ SECTION DROITE — Rendez-vous ═════════════════════════════════════ */}
        <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
            <div>
              <p className="text-sm font-bold" style={{ color: '#111111' }}>Rendez-vous</p>
              <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>{appointments.length} au total</p>
            </div>
            <button onClick={loadAppointments} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>

          {loadingAppts ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-2">
              <CalendarDays className="w-8 h-8 text-gray-200" />
              <p className="text-sm text-gray-300">Aucun rendez-vous</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 max-h-[700px] overflow-y-auto">
              {appointments.map(appt => {
                const cfg = STATUS_CONFIG[appt.status]
                return (
                  <button key={appt.id} onClick={() => openAppt(appt)}
                    className="w-full text-left px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: '#111111' }}>
                          {appt.restaurant_name}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>{appt.owner_name}</p>
                        {appt.slot && (
                          <p className="text-xs mt-1 flex items-center gap-1" style={{ color: '#9CA3AF' }}>
                            <Clock className="w-3 h-3" />
                            {fmtDateTime(appt.slot)}
                          </p>
                        )}
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cfg.bg, color: cfg.color }}>
                        {cfg.label}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ══ Modale annulation RDV ════════════════════════════════════════════ */}
      {showCancelModal && selected && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCancelModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm"
            style={{ border: '1px solid #E5E7EB' }}>
            <h3 className="text-base font-bold text-gray-900 mb-1">Annuler ce rendez-vous</h3>
            <p className="text-sm text-gray-500 mb-5">
              Que souhaitez-vous faire avec le créneau associé ?
            </p>
            <div className="space-y-2.5">
              {selected.slot_id ? (
                <>
                  <button
                    onClick={() => handleCancelWithSlot('restore')}
                    className="w-full flex flex-col items-start px-4 py-3 rounded-xl text-left transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#F0FDF4', border: '1px solid #BBF7D0' }}>
                    <span className="text-sm font-bold" style={{ color: '#16A34A' }}>Remettre le créneau en ligne</span>
                    <span className="text-xs mt-0.5" style={{ color: '#4B7C59' }}>Le créneau sera à nouveau disponible pour les réservations</span>
                  </button>
                  <button
                    onClick={() => handleCancelWithSlot('delete')}
                    className="w-full flex flex-col items-start px-4 py-3 rounded-xl text-left transition-colors hover:opacity-90"
                    style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                    <span className="text-sm font-bold" style={{ color: '#DC2626' }}>Supprimer le créneau</span>
                    <span className="text-xs mt-0.5" style={{ color: '#9B1C1C' }}>Le créneau sera définitivement supprimé</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => handleCancelWithSlot('restore')}
                  className="w-full flex flex-col items-start px-4 py-3 rounded-xl text-left transition-colors hover:opacity-90"
                  style={{ backgroundColor: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <span className="text-sm font-bold" style={{ color: '#DC2626' }}>Confirmer l&apos;annulation</span>
                  <span className="text-xs mt-0.5" style={{ color: '#9B1C1C' }}>Ce rendez-vous n&apos;a pas de créneau associé</span>
                </button>
              )}
            </div>
            <button
              onClick={() => setShowCancelModal(false)}
              className="mt-4 w-full py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors"
              style={{ border: '1px solid #E5E7EB' }}>
              Annuler sans modifier
            </button>
          </div>
        </div>
      )}

      {/* ══ Panneau latéral — Détail rendez-vous ═════════════════════════════ */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative w-full max-w-md bg-white h-full overflow-y-auto shadow-2xl flex flex-col"
            style={{ borderLeft: '1px solid #E5E7EB' }}>

            <div className="sticky top-0 bg-white z-10 px-6 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <p className="font-bold text-gray-900">{selected.restaurant_name}</p>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: STATUS_CONFIG[selected.status].bg, color: STATUS_CONFIG[selected.status].color }}>
                  {STATUS_CONFIG[selected.status].label}
                </span>
              </div>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 flex-1 space-y-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>Coordonnées</p>
                <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
                  {([
                    ['Restaurant', selected.restaurant_name],
                    ['Responsable', selected.owner_name],
                    ...(selected.email ? [['Email', selected.email]] : []),
                    ...(selected.whatsapp ? [['WhatsApp', selected.whatsapp]] : []),
                  ] as [string, string][]).map(([k, v]) => (
                    <div key={k} className="flex justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #F3F4F6' }}>
                      <span className="text-xs text-gray-400 w-28 flex-shrink-0">{k}</span>
                      <span className="text-xs font-medium text-right" style={{ color: '#111111' }}>{v}</span>
                    </div>
                  ))}
                  {selected.slot && (
                    <div className="flex justify-between px-4 py-2.5">
                      <span className="text-xs text-gray-400 w-28 flex-shrink-0">Créneau</span>
                      <span className="text-xs font-medium text-right" style={{ color: '#111111' }}>
                        {fmtDateTime(selected.slot)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {selected.whatsapp && (
                <a href={`https://wa.me/${selected.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Bonjour ${selected.owner_name}, concernant votre rendez-vous TerangaLink`)}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: '#25D366' }}>
                  <MessageCircle className="w-4 h-4" />Contacter sur WhatsApp
                </a>
              )}

              {selected.status !== 'done' && selected.status !== 'cancelled' && (
                <div className="grid grid-cols-2 gap-2">
                  <button onClick={() => handleUpdateStatus('done')} disabled={updatingStatus}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#F0FDF4', color: '#16A34A', border: '1px solid #BBF7D0' }}>
                    {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    Marquer terminé
                  </button>
                  <button onClick={() => setShowCancelModal(true)} disabled={updatingStatus}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold disabled:opacity-50"
                    style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA' }}>
                    {updatingStatus ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                    Annuler
                  </button>
                </div>
              )}

              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>Notes internes</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4}
                  placeholder="Notes visibles uniquement par l'équipe TerangaLink..."
                  className="w-full px-3 py-2.5 rounded-xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400"
                  style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }} />
                <button onClick={handleSaveNotes} disabled={savingNotes}
                  className="mt-2 text-xs font-semibold px-4 py-1.5 rounded-lg text-white disabled:opacity-50"
                  style={{ backgroundColor: '#6B7280' }}>
                  {savingNotes ? 'Sauvegarde...' : 'Sauvegarder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
