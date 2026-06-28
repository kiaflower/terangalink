'use client'

import { useState, useEffect } from 'react'
import { Calendar, MessageCircle, X, Clock, Check, Loader2, ArrowRight } from 'lucide-react'

interface Slot {
  id: string
  date: string
  start_time: string
  end_time: string
}

const WHATSAPP_URL = `https://wa.me/221774739266?text=${encodeURIComponent('Bonjour, je souhaite en savoir plus sur TerangaLink pour mon restaurant.')}`
const MONTHS = ['jan.', 'fév.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']

function fmtDate(iso: string) {
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
}

export function CtaDecouverte() {
  const [open, setOpen] = useState(false)
  const [slots, setSlots] = useState<Slot[]>([])
  const [loading, setLoading] = useState(false)
  const [noSlots, setNoSlots] = useState(false)
  const [selected, setSelected] = useState<Slot | null>(null)

  // Formulaire prospect
  const [name, setName] = useState('')
  const [restaurant, setRestaurant] = useState('')
  const [whatsapp, setWhatsapp] = useState('')
  const [booking, setBooking] = useState(false)
  const [booked, setBooked] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/slots')
      .then(r => r.json())
      .then(data => {
        const list: Slot[] = Array.isArray(data) ? data : []
        setSlots(list)
        setNoSlots(list.length === 0)
        setLoading(false)
      })
      .catch(() => { setNoSlots(true); setLoading(false) })
  }, [open])

  async function handleBook() {
    if (!selected || !name.trim() || !whatsapp.trim()) return
    setBooking(true)
    const res = await fetch('/api/slots', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slot_id: selected.id,
        restaurant_id: null,
        restaurant_name: restaurant.trim() || 'Non renseigné',
        owner_name: name.trim(),
        email: null,
        whatsapp: whatsapp.trim(),
      }),
    })
    setBooking(false)
    if (res.ok) {
      setSlots(prev => prev.filter(s => s.id !== selected.id))
      setBooked(true)
    }
  }

  // Grouper par date
  const byDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    if (!acc[s.date]) acc[s.date] = []
    acc[s.date].push(s)
    return acc
  }, {})

  return (
    <>
      <section className="section" style={{ borderTop: '1px solid #E5E7EB', backgroundColor: '#F9FAFB' }}>
        <div className="container-app">
          <div className="rounded-3xl p-10 sm:p-16 text-center text-white"
            style={{ backgroundColor: '#F97316', boxShadow: '0 8px 40px rgba(249,115,22,0.2)' }}>
            <h2 className="heading-lg mb-3">Prêt à rejoindre TerangaLink ?</h2>
            <p className="text-lg mb-8 max-w-xl mx-auto" style={{ color: 'rgba(255,255,255,0.85)' }}>
              Découvrez comment TerangaLink peut transformer votre restaurant en 30 minutes.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => { setOpen(true); setBooked(false); setSelected(null) }}
                className="inline-flex items-center gap-2 font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:opacity-90 group"
                style={{ backgroundColor: '#FFFFFF', color: '#F97316' }}>
                <Calendar className="w-5 h-5" />
                Réserver un appel découverte
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-2 font-semibold px-7 py-3.5 rounded-xl text-base transition-all hover:bg-white/10"
                style={{ color: '#FFFFFF', border: '2px solid rgba(255,255,255,0.5)' }}>
                <MessageCircle className="w-5 h-5" />
                Nous écrire sur WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => !booked && setOpen(false)} />
          <div className="relative w-full max-w-md rounded-t-3xl sm:rounded-3xl bg-white max-h-[90vh] overflow-y-auto shadow-2xl">

            <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid #E5E7EB' }}>
              <div>
                <p className="font-bold" style={{ color: '#111111' }}>Réserver un appel découverte</p>
                <p className="text-xs mt-0.5" style={{ color: '#9CA3AF' }}>Gratuit · 30 minutes · Sans engagement</p>
              </div>
              {!booked && (
                <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            <div className="p-6">
              {booked ? (
                <div className="text-center py-6">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                    style={{ backgroundColor: '#F0FDF4', border: '2px solid #22C55E' }}>
                    <Check className="w-8 h-8 text-green-500" />
                  </div>
                  <p className="font-bold text-lg mb-1" style={{ color: '#111111' }}>Appel réservé !</p>
                  {selected && (
                    <p className="text-sm mb-1" style={{ color: '#6B7280' }}>{fmtDate(selected.date)}</p>
                  )}
                  {selected && (
                    <p className="text-sm font-semibold mb-4" style={{ color: '#F97316' }}>
                      {selected.start_time.slice(0, 5)} – {selected.end_time.slice(0, 5)}
                    </p>
                  )}
                  <p className="text-xs mb-6" style={{ color: '#9CA3AF' }}>
                    Notre équipe vous contactera sur WhatsApp pour confirmer.
                  </p>
                  <button onClick={() => setOpen(false)}
                    className="w-full py-3 rounded-xl font-semibold text-white"
                    style={{ backgroundColor: '#F97316' }}>
                    Fermer
                  </button>
                </div>
              ) : loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin text-orange-500" />
                </div>
              ) : noSlots ? (
                <div className="text-center py-8">
                  <Clock className="w-10 h-10 mx-auto mb-3 text-gray-300" />
                  <p className="font-semibold mb-1" style={{ color: '#374151' }}>Aucun créneau disponible pour le moment</p>
                  <p className="text-sm mb-5" style={{ color: '#9CA3AF' }}>Contactez-nous sur WhatsApp pour fixer un appel.</p>
                  <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 font-bold text-sm px-5 py-2.5 rounded-xl text-white"
                    style={{ backgroundColor: '#25D366' }}>
                    <MessageCircle className="w-4 h-4" />Nous écrire sur WhatsApp
                  </a>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Sélection créneau */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>
                      1. Choisissez un créneau
                    </p>
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {Object.entries(byDate).map(([date, daySlots]) => (
                        <div key={date}>
                          <p className="text-xs font-semibold mb-1.5" style={{ color: '#6B7280' }}>{fmtDate(date)}</p>
                          <div className="grid grid-cols-2 gap-2">
                            {daySlots.map(slot => (
                              <button key={slot.id} onClick={() => setSelected(slot)}
                                className="py-2.5 rounded-xl text-sm font-semibold transition-all"
                                style={{
                                  backgroundColor: selected?.id === slot.id ? '#FFF7ED' : '#F9FAFB',
                                  border: selected?.id === slot.id ? '2px solid #F97316' : '1px solid #E5E7EB',
                                  color: selected?.id === slot.id ? '#F97316' : '#374151',
                                }}>
                                {slot.start_time.slice(0, 5)} – {slot.end_time.slice(0, 5)}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Formulaire prospect */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: '#9CA3AF' }}>
                      2. Vos coordonnées
                    </p>
                    <div className="space-y-3">
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        placeholder="Votre nom *"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
                      />
                      <input
                        type="text" value={restaurant} onChange={e => setRestaurant(e.target.value)}
                        placeholder="Nom de votre restaurant (optionnel)"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
                      />
                      <input
                        type="tel" value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                        placeholder="Votre WhatsApp *"
                        className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                        style={{ border: '1px solid #E5E7EB', backgroundColor: '#F9FAFB', color: '#111111' }}
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleBook}
                    disabled={!selected || !name.trim() || !whatsapp.trim() || booking}
                    className="w-full py-3 rounded-xl font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                    style={{ backgroundColor: '#F97316' }}>
                    {booking ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : 'Confirmer le rendez-vous'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
