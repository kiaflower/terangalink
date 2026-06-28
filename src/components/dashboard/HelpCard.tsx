'use client'

import { useState, useEffect } from 'react'
import { Calendar, MessageCircle, X, Clock, Check, Loader2 } from 'lucide-react'

interface Slot {
  id: string
  date: string
  start_time: string
  end_time: string
  is_booked: boolean
}

interface HelpCardProps {
  restaurantId: string
  restaurantName: string
  ownerName: string
  email: string | null
  whatsapp: string | null
}

const MONTHS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`
}

const WHATSAPP_HELP = `https://wa.me/221774739266?text=${encodeURIComponent("Bonjour, j'ai besoin d'aide pour configurer mon restaurant sur TerangaLink.")}`

export function HelpCard({ restaurantId, restaurantName, ownerName, email, whatsapp }: HelpCardProps) {
  const [open, setOpen] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [selected, setSelected] = useState<Slot | null>(null)
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)
  const [bookError, setBookError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/slots')
      .then(r => r.json())
      .then(data => {
        setSlots(Array.isArray(data) ? data : [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [open])

  async function handleBook() {
    if (!selected) return
    setBooking(true)
    setBookError(null)
    try {
      const res = await fetch('/api/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_id: selected.id,
          restaurant_id: restaurantId,
          restaurant_name: restaurantName,
          owner_name: ownerName,
          email: email ?? null,
          whatsapp: whatsapp ?? null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        setBookError(json.error || `Erreur ${res.status}`)
      } else {
        setSlots(prev => prev.filter(s => s.id !== selected.id))
        setBooked(true)
      }
    } catch (e) {
      setBookError('Erreur réseau')
    }
    setBooking(false)
  }

  return (
    <>
      {/* Carte */}
      <div className="mt-6 rounded-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
        style={{ backgroundColor: '#FFF7ED', border: '1.5px solid #FED7AA' }}>
        <div className="flex-1">
          <p className="text-sm font-bold" style={{ color: '#111111' }}>Besoin d&apos;aide ?</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            Besoin d&apos;aide pour configurer votre restaurant ou utiliser TerangaLink ?
          </p>
        </div>
        <div className="flex gap-2 flex-wrap flex-shrink-0">
          <button
            onClick={() => { setOpen(true); setBooked(false); setSelected(null) }}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: '#F97316' }}>
            <Calendar className="w-3.5 h-3.5" />
            Réserver un appel
          </button>
          <a href={WHATSAPP_HELP} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2.5 rounded-xl transition-colors hover:bg-green-50"
            style={{ color: '#16A34A', border: '1.5px solid #BBF7D0' }}>
            <MessageCircle className="w-3.5 h-3.5" />
            Contacter sur WhatsApp
          </a>
        </div>
      </div>

      {/* Modal créneaux */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
            style={{ border: '1px solid #E5E7EB' }}>

            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <p className="font-bold text-sm" style={{ color: '#111111' }}>Réserver un appel avec TerangaLink</p>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5">
              {booked ? (
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ backgroundColor: '#F0FDF4' }}>
                    <Check className="w-6 h-6 text-green-500" />
                  </div>
                  <p className="font-bold" style={{ color: '#111111' }}>Rendez-vous confirmé !</p>
                  <p className="text-xs" style={{ color: '#6B7280' }}>
                    Notre équipe vous contactera au créneau choisi.<br />
                    {selected && <span className="font-semibold">{fmtDate(selected.date)} · {selected.start_time.slice(0, 5)} – {selected.end_time.slice(0, 5)}</span>}
                  </p>
                  <button onClick={() => setOpen(false)}
                    className="mt-2 text-xs font-semibold px-5 py-2 rounded-xl text-white"
                    style={{ backgroundColor: '#F97316' }}>
                    Fermer
                  </button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                </div>
              ) : slots.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-8 h-8 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-500 font-medium">Aucun créneau disponible</p>
                  <p className="text-xs text-gray-400 mt-1">Contactez-nous sur WhatsApp pour fixer un appel.</p>
                  <a href={WHATSAPP_HELP} target="_blank" rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold px-4 py-2 rounded-xl text-white"
                    style={{ backgroundColor: '#25D366' }}>
                    <MessageCircle className="w-3.5 h-3.5" />WhatsApp
                  </a>
                </div>
              ) : (
                <>
                  <p className="text-xs font-semibold mb-3" style={{ color: '#6B7280' }}>
                    Choisissez un créneau disponible :
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {slots.map(slot => (
                      <button key={slot.id}
                        onClick={() => setSelected(selected?.id === slot.id ? null : slot)}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all"
                        style={{
                          border: selected?.id === slot.id ? '2px solid #F97316' : '1.5px solid #E5E7EB',
                          backgroundColor: selected?.id === slot.id ? '#FFF7ED' : '#F9FAFB',
                        }}>
                        <Clock className="w-4 h-4 flex-shrink-0" style={{ color: selected?.id === slot.id ? '#F97316' : '#9CA3AF' }} />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: '#111111' }}>
                            {fmtDate(slot.date)}
                          </p>
                          <p className="text-xs" style={{ color: '#6B7280' }}>
                            {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                          </p>
                        </div>
                        {selected?.id === slot.id && (
                          <Check className="w-4 h-4 ml-auto" style={{ color: '#F97316' }} />
                        )}
                      </button>
                    ))}
                  </div>

                  {bookError && (
                    <p className="mt-3 text-xs text-center px-3 py-2 rounded-lg" style={{ backgroundColor: '#FEF2F2', color: '#DC2626' }}>
                      Erreur : {bookError}
                    </p>
                  )}

                  <button
                    onClick={handleBook}
                    disabled={!selected || booking}
                    className="mt-4 w-full py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: '#F97316' }}>
                    {booking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer le rendez-vous'}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
