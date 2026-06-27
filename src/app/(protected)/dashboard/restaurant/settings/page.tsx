'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Clock, Truck, Phone, Save, CheckCircle, AlertCircle, Loader2, Wallet, Timer, Lock, Eye, EyeOff, ToggleLeft, ToggleRight } from 'lucide-react'
import { getPlanFeatures } from '@/lib/plans'

const JOURS = [
  { key: 'lundi', label: 'Lundi' },
  { key: 'mardi', label: 'Mardi' },
  { key: 'mercredi', label: 'Mercredi' },
  { key: 'jeudi', label: 'Jeudi' },
  { key: 'vendredi', label: 'Vendredi' },
  { key: 'samedi', label: 'Samedi' },
  { key: 'dimanche', label: 'Dimanche' },
] as const

type HoursEntry = { ouverture: string; fermeture: string; ferme: boolean }
type OpeningHours = Partial<Record<string, HoursEntry>>

const PREP_TIMES = [10, 15, 20, 25, 30, 40, 45, 60]

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [restaurantId, setRestaurantId] = useState<string | null>(null)
  const [plan, setPlan] = useState<string>('starter')
  const isPremium = getPlanFeatures(plan).variantesProduits

  // Paramètres restaurant
  const [whatsapp, setWhatsapp] = useState('')
  const [openingHours, setOpeningHours] = useState<OpeningHours>({})
  const [deliveryFee, setDeliveryFee] = useState('0')
  const [showDeliveryFee, setShowDeliveryFee] = useState(false)
  const [waveNumber, setWaveNumber] = useState('')
  const [orangeMoneyNumber, setOrangeMoneyNumber] = useState('')
  const [prepTime, setPrepTime] = useState(25)

  // Changement de mot de passe
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwdSaving, setPwdSaving] = useState(false)
  const [pwdMessage, setPwdMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', user.id).single()
    if (!profile?.restaurant_id) { setLoading(false); return }
    setRestaurantId(profile.restaurant_id)

    const { data: r } = await supabase
      .from('restaurants')
      .select('whatsapp_number, opening_hours, delivery_fee, show_delivery_fee, wave_number, orange_money_number, prep_time_minutes')
      .eq('id', profile.restaurant_id)
      .single()

    if (r) {
      setWhatsapp(r.whatsapp_number || '')
      setOpeningHours((r.opening_hours as OpeningHours) || {})
      setDeliveryFee(String(r.delivery_fee || 0))
      setShowDeliveryFee(r.show_delivery_fee || false)
      setWaveNumber(r.wave_number || '')
      setOrangeMoneyNumber(r.orange_money_number || '')
      setPrepTime(r.prep_time_minutes || 25)
    }

    // Plan
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('restaurant_id', profile.restaurant_id)
      .single()
    setPlan(sub?.plan ?? 'starter')
    setLoading(false)
  }, [supabase])

  useEffect(() => { loadData() }, [loadData])

  function updateHours(jour: string, field: 'ouverture' | 'fermeture' | 'ferme', value: string | boolean) {
    setOpeningHours(prev => ({
      ...prev,
      [jour]: {
        ouverture: '08:00',
        fermeture: '22:00',
        ferme: false,
        ...(prev[jour] || {}),
        [field]: value,
      },
    }))
  }

  async function handleSave() {
    if (!restaurantId) return
    setSaving(true)
    setMessage(null)

    const { error } = await supabase.from('restaurants').update({
      whatsapp_number: whatsapp || null,
      opening_hours: openingHours,
      delivery_fee: parseInt(deliveryFee) || 0,
      show_delivery_fee: showDeliveryFee,
      wave_number: waveNumber || null,
      orange_money_number: orangeMoneyNumber || null,
      prep_time_minutes: prepTime,
    }).eq('id', restaurantId)

    setSaving(false)
    setMessage(error
      ? { type: 'error', text: 'Erreur lors de la sauvegarde.' }
      : { type: 'success', text: 'Paramètres mis à jour avec succès !' }
    )
    setTimeout(() => setMessage(null), 3000)
  }

  async function handleChangePassword() {
    setPwdMessage(null)

    if (!newPassword || newPassword.length < 8) {
      setPwdMessage({ type: 'error', text: 'Le nouveau mot de passe doit faire au moins 8 caractères.' })
      return
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage({ type: 'error', text: 'Les mots de passe ne correspondent pas.' })
      return
    }

    setPwdSaving(true)

    // Vérifier l'ancien mot de passe en tentant une reconnexion
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) { setPwdSaving(false); return }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })

    if (signInError) {
      setPwdSaving(false)
      setPwdMessage({ type: 'error', text: 'Mot de passe actuel incorrect.' })
      return
    }

    // Changer le mot de passe
    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      setPwdSaving(false)
      setPwdMessage({ type: 'error', text: error.message })
      return
    }

    // Sauvegarder le nouveau mot de passe pour le super-admin
    await supabase.from('profiles').update({
      temp_password: newPassword,
    }).eq('id', user.id)

    setPwdSaving(false)
    setPwdMessage({ type: 'success', text: 'Mot de passe mis à jour avec succès !' })
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setTimeout(() => setPwdMessage(null), 4000)
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-64"><Loader2 className="w-8 h-8 animate-spin text-brand-orange" /></div>
  }

  return (
    <div className="p-6 sm:p-8 max-w-2xl">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-500 text-sm mt-1">Horaires, paiements et livraison</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Enregistrer
        </button>
      </div>

      {message && (
        <div className={`flex items-center gap-3 p-4 rounded-xl mb-6 ${message.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
          {message.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
          {message.text}
        </div>
      )}

      <div className="space-y-6">

        {/* ── Paiement mobile ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Wallet className="w-4 h-4 text-brand-orange" />
            <h2 className="text-gray-900 font-semibold text-sm">Numéros de paiement mobile</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">Ces numéros seront envoyés au client dans le message de confirmation de commande.</p>
          <div className="space-y-4">
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#1E90FF] inline-flex items-center justify-center text-gray-900 font-bold" style={{fontSize:'9px'}}>W</span>
                  Numéro Wave
                </span>
              </label>
              <input type="text" value={waveNumber} onChange={e => setWaveNumber(e.target.value)} placeholder="77 123 45 67"
                className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-4 h-4 rounded-full bg-[#FF6600] inline-flex items-center justify-center text-gray-900 font-bold" style={{fontSize:'9px'}}>O</span>
                  Numéro Orange Money
                </span>
              </label>
              <input type="text" value={orangeMoneyNumber} onChange={e => setOrangeMoneyNumber(e.target.value)} placeholder="76 123 45 67"
                className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
            </div>
          </div>
        </div>

        {/* ── Temps de préparation ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Timer className="w-4 h-4 text-brand-orange" />
            <h2 className="text-gray-900 font-semibold text-sm">Temps de préparation</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">Durée estimée communiquée au client lors de la confirmation de commande.</p>
          <div className="flex flex-wrap gap-2">
            {PREP_TIMES.map(t => (
              <button key={t} onClick={() => setPrepTime(t)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${prepTime === t ? 'bg-brand-orange text-white' : 'bg-gray-100 text-gray-500 hover:text-gray-900 border border-gray-300'}`}>
                {t} min
              </button>
            ))}
          </div>
          <p className="text-gray-500 text-xs mt-3">Sélectionné : <span className="text-brand-orange font-semibold">{prepTime} minutes</span></p>
        </div>

        {/* ── WhatsApp ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Phone className="w-4 h-4 text-brand-orange" />
            <h2 className="text-gray-900 font-semibold text-sm">WhatsApp restaurant</h2>
          </div>
          <div>
            <label className="text-gray-500 text-xs block mb-1.5">Numéro WhatsApp (ex: 221771234567)</label>
            <input type="text" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="221771234567"
              className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
            <p className="text-gray-500 text-xs mt-1">Format international sans + ni espaces. Les commandes client arrivent sur ce numéro.</p>
          </div>
        </div>

        {/* ── Livraison ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Truck className="w-4 h-4 text-brand-orange" />
            <h2 className="text-gray-900 font-semibold text-sm">Livraison</h2>
          </div>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showDeliveryFee} onChange={e => setShowDeliveryFee(e.target.checked)} className="w-4 h-4 accent-brand-orange" />
              <span className="text-gray-500 text-sm">Afficher les frais de livraison sur la page du restaurant</span>
            </label>
            {showDeliveryFee && (
              <div>
                <label className="text-gray-500 text-xs block mb-1.5">Frais de livraison (FCFA)</label>
                <input type="number" value={deliveryFee} onChange={e => setDeliveryFee(e.target.value)} placeholder="2000" min="0"
                  className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50" />
              </div>
            )}
          </div>
        </div>

        {/* ── Horaires ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-5">
            <Clock className="w-4 h-4 text-brand-orange" />
            <h2 className="text-gray-900 font-semibold text-sm">Horaires d&apos;ouverture</h2>
          </div>
          <div className="space-y-4">
            {JOURS.map(({ key, label }) => {
              const h = openingHours[key]
              const ferme = h?.ferme || false
              return (
                <div key={key} className="flex items-center gap-3 flex-wrap">
                  <span className="text-gray-500 text-sm w-24 flex-shrink-0">{label}</span>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!ferme} onChange={e => updateHours(key, 'ferme', !e.target.checked)} className="w-4 h-4 accent-brand-orange" />
                    <span className="text-xs text-gray-500">Ouvert</span>
                  </label>
                  {!ferme ? (
                    <>
                      <input type="time" value={h?.ouverture || '08:00'} onChange={e => updateHours(key, 'ouverture', e.target.value)}
                        className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 w-28" />
                      <span className="text-gray-500 text-xs">→</span>
                      <input type="time" value={h?.fermeture || '22:00'} onChange={e => updateHours(key, 'fermeture', e.target.value)}
                        className="bg-gray-100 border border-gray-300 rounded-lg px-3 py-1.5 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50 w-28" />
                    </>
                  ) : (
                    <span className="text-xs text-red-400">Fermé</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Sécurité — Changer mot de passe ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-1">
            <Lock className="w-4 h-4 text-brand-orange" />
            <h2 className="text-gray-900 font-semibold text-sm">Sécurité</h2>
          </div>
          <p className="text-gray-500 text-xs mb-4">Changez votre mot de passe de connexion.</p>

          {pwdMessage && (
            <div className={`flex items-center gap-3 p-3 rounded-xl mb-4 text-sm ${pwdMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
              {pwdMessage.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0" /> : <AlertCircle className="w-4 h-4 flex-shrink-0" />}
              {pwdMessage.text}
            </div>
          )}

          <div className="space-y-3">
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Mot de passe actuel</label>
              <div className="relative">
                <input
                  type={showCurrent ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={e => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                />
                <button type="button" onClick={() => setShowCurrent(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-500">
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Minimum 8 caractères"
                  className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-500">
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <div>
              <label className="text-gray-500 text-xs block mb-1.5">Confirmer le nouveau mot de passe</label>
              <div className="relative">
                <input
                  type={showConfirm ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-100 border border-gray-300 rounded-xl px-4 py-3 pr-11 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-brand-orange/50"
                />
                <button type="button" onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-500">
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              onClick={handleChangePassword}
              disabled={pwdSaving || !currentPassword || !newPassword || !confirmPassword}
              className="w-full flex items-center justify-center gap-2 bg-brand-orange hover:bg-brand-orange-dark text-white py-3 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 mt-1"
            >
              {pwdSaving ? <><Loader2 className="w-4 h-4 animate-spin" />Mise à jour...</> : <><Lock className="w-4 h-4" />Mettre à jour le mot de passe</>}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
