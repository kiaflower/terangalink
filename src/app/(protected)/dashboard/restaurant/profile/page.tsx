'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Restaurant } from '@/lib/types'
import { CUISINE_OPTIONS } from '@/lib/cuisines'
import { fileToCompressedBlob } from '@/lib/imageUtils'
import { Check, Upload, Truck } from 'lucide-react'

export default function ProfilePage() {
  const supabase = createClient()
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [form, setForm] = useState<Partial<Restaurant>>({})
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (!d.restaurant_id) return
      const { data } = await supabase.from('restaurants').select('*').eq('id', d.restaurant_id).single()
      if (data) { setRestaurant(data); setForm(data) }
    })
  }, [supabase])

  async function uploadImage(file: File, kind: 'logo' | 'cover') {
    if (!restaurant) return
    kind === 'logo' ? setUploadingLogo(true) : setUploadingCover(true)
    const compressed = await fileToCompressedBlob(file, kind === 'cover' ? 1600 : 800)
    const path = `${restaurant.id}/${kind}-${Date.now()}-${compressed.name}`
    const { error } = await supabase.storage.from('restaurant-images').upload(path, compressed, { upsert: false })
    if (!error) {
      const { data } = supabase.storage.from('restaurant-images').getPublicUrl(path)
      setForm(f => ({ ...f, [kind === 'logo' ? 'logo_url' : 'cover_url']: data.publicUrl }))
    }
    kind === 'logo' ? setUploadingLogo(false) : setUploadingCover(false)
  }

  async function save() {
    if (!restaurant) return
    setSaving(true)
    setError(null)
    // .select().single() est indispensable ici : sous RLS, un update qui ne
    // correspond à aucune ligne autorisée ne renvoie PAS d'erreur par défaut
    // (0 ligne affectée, silencieusement) — .single() force PostgREST à
    // renvoyer une erreur explicite si la ligne modifiée n'est pas retournée,
    // ce qui est la seule façon fiable de détecter qu'une sauvegarde a échoué.
    const { data, error: saveError } = await supabase.from('restaurants').update({
      name: form.name,
      description: form.description,
      cuisine_type: form.cuisine_type,
      city: form.city,
      address: form.address,
      phone: form.phone,
      facebook_url: form.facebook_url,
      instagram_url: form.instagram_url,
      tiktok_url: form.tiktok_url,
      snapchat_url: form.snapchat_url,
      wave_number: form.wave_number,
      orange_money_number: form.orange_money_number,
      delivery_info: form.delivery_info,
      show_delivery_info: form.show_delivery_info,
      logo_url: form.logo_url,
      cover_url: form.cover_url,
    }).eq('id', restaurant.id).select().single()

    setSaving(false)
    if (saveError || !data) {
      setError('La sauvegarde a échoué. Réessayez ou contactez le support si le problème persiste.')
      return
    }
    setRestaurant(data)
    setForm(data)
    setSuccess(true)
    setTimeout(() => setSuccess(false), 3000)
  }

  const field = (label: string, key: keyof Restaurant, type = 'text', placeholder = '') => (
    <div key={key}>
      <label className="text-xs text-gray-400 mb-1 block">{label}</label>
      <input
        type={type}
        value={(form[key] as string) ?? ''}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        placeholder={placeholder}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
      />
    </div>
  )

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">Profil de le restaurant</h1>
      <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Logo</label>
          <div className="flex items-center gap-3">
            {form.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.logo_url} alt="" className="w-16 h-16 rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-16 h-16 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 text-xs">Logo</div>
            )}
            <label className="inline-flex items-center gap-2 text-sm border border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-brand-orange text-gray-600 hover:text-brand-orange transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'logo')} />
              <Upload className="w-4 h-4" />
              {uploadingLogo ? 'Envoi…' : 'Changer le logo'}
            </label>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Photo de couverture</label>
          <div className="space-y-2">
            {form.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.cover_url} alt="" className="w-full h-28 rounded-xl object-cover border border-gray-200" />
            ) : (
              <div className="w-full h-28 rounded-xl bg-gray-100 flex items-center justify-center text-gray-300 text-xs">Couverture</div>
            )}
            <label className="inline-flex items-center gap-2 text-sm border border-gray-200 rounded-xl px-4 py-2.5 cursor-pointer hover:border-brand-orange text-gray-600 hover:text-brand-orange transition-colors">
              <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && uploadImage(e.target.files[0], 'cover')} />
              <Upload className="w-4 h-4" />
              {uploadingCover ? 'Envoi…' : 'Changer la couverture'}
            </label>
          </div>
        </div>

        {field('Nom de le restaurant *', 'name')}
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Description</label>
          <textarea
            value={(form.description as string) ?? ''}
            onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
            rows={3}
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange resize-none"
          />
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Catégorie</label>
          <select
            value={(form.cuisine_type as string) ?? ''}
            onChange={e => setForm(f => ({ ...f, cuisine_type: e.target.value }))}
            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange"
          >
            {CUISINE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        {field('Ville', 'city', 'text', 'Dakar')}
        {field('Adresse', 'address')}
        {field('Téléphone', 'phone', 'tel')}

        <h3 className="text-sm font-medium text-gray-500 pt-2">Réseaux sociaux</h3>
        {field('Instagram', 'instagram_url', 'url', 'https://instagram.com/...')}
        {field('Facebook', 'facebook_url', 'url', 'https://facebook.com/...')}
        {field('TikTok', 'tiktok_url', 'url', 'https://tiktok.com/@...')}
        {field('Snapchat', 'snapchat_url', 'url')}

        <h3 className="text-sm font-medium text-gray-500 pt-2">Paiement mobile</h3>
        {field('Numéro Wave', 'wave_number', 'tel')}
        {field("Numéro Orange Money", 'orange_money_number', 'tel')}

        <h3 className="text-sm font-medium text-gray-500 pt-2">Bandeau livraison (affiché sur votre restaurant)</h3>
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            id="show_delivery"
            checked={!!form.show_delivery_info}
            onChange={e => setForm(f => ({ ...f, show_delivery_info: e.target.checked }))}
            className="w-4 h-4 accent-brand-orange"
          />
          <label htmlFor="show_delivery" className="text-sm text-gray-400">Afficher ce bandeau sur mon restaurant</label>
        </div>
        <div>
          <label className="text-xs text-gray-400 mb-1 block">Texte du bandeau (ex: &quot;Livraison gratuite à Dakar&quot;, &quot;Livraison payante, 1500 FCFA&quot;...)</label>
          <textarea
            value={(form.delivery_info as string) ?? ''}
            onChange={e => setForm(f => ({ ...f, delivery_info: e.target.value }))}
            rows={2}
            placeholder="Ex: Livraison disponible à Dakar, délai 24h..."
            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:outline-none focus:border-brand-orange resize-none"
          />
        </div>
        {form.show_delivery_info && (form.delivery_info as string) && (
          <div>
            <p className="text-xs text-gray-400 mb-1.5">Aperçu — ce qui sera affiché publiquement :</p>
            <div className="rounded-2xl p-5 flex items-center gap-4 bg-white border border-gray-200">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-brand-orange/10">
                <Truck className="w-5 h-5 text-brand-orange" />
              </div>
              <div>
                <p className="font-semibold text-sm text-gray-900">Livraison</p>
                <p className="text-xs text-gray-500">{form.delivery_info as string}</p>
              </div>
            </div>
          </div>
        )}

        {success && <p className="text-green-400 text-sm flex items-center gap-1.5"><Check className="w-4 h-4" /> Profil mis à jour avec succès</p>}
        {error && <p className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3">{error}</p>}
        <button
          onClick={save}
          disabled={saving}
          className="w-full bg-brand-orange text-white py-3 rounded-xl font-semibold hover:bg-brand-orange-dark transition-colors disabled:opacity-50"
        >
          {saving ? 'Enregistrement...' : 'Sauvegarder'}
        </button>
      </div>
    </div>
  )
}
