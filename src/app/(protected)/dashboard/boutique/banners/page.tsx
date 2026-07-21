'use client'

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { FeatureGate } from '@/components/FeatureGate'
import type { PlanKey } from '@/lib/plans'
import { Trash2, Plus } from 'lucide-react'

interface Banner {
  id: string
  text: string
  is_active: boolean
  created_at: string
}

const MAX_ACTIVE = 3

function BannersManager({ boutiqueId }: { boutiqueId: string }) {
  const supabase = createClient()
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [newText, setNewText] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('boutique_banners')
      .select('id, text, is_active, created_at')
      .eq('boutique_id', boutiqueId)
      .order('created_at', { ascending: false })
    setBanners(data ?? [])
    setLoading(false)
  }, [boutiqueId, supabase])

  useEffect(() => { load() }, [load])

  const activeCount = banners.filter(b => b.is_active).length

  async function addBanner() {
    if (!newText.trim()) return
    if (activeCount >= MAX_ACTIVE) {
      setError(`Maximum ${MAX_ACTIVE} bannières actives simultanément`)
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('boutique_banners').insert({ boutique_id: boutiqueId, text: newText.trim(), is_active: true })
    if (error) setError('Erreur lors de la création')
    else setNewText('')
    await load()
    setSaving(false)
  }

  async function toggleBanner(banner: Banner) {
    if (!banner.is_active && activeCount >= MAX_ACTIVE) {
      setError(`Maximum ${MAX_ACTIVE} bannières actives simultanément`)
      return
    }
    setError(null)
    await supabase.from('boutique_banners').update({ is_active: !banner.is_active }).eq('id', banner.id)
    await load()
  }

  async function deleteBanner(id: string) {
    await supabase.from('boutique_banners').delete().eq('id', id)
    await load()
  }

  if (loading) return <p className="text-gray-400 text-sm py-8">Chargement...</p>

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Bannières promotionnelles</h1>
      <p className="text-gray-500 text-sm mb-8">
        Affichez un message court au-dessus de vos catégories sur votre vitrine (ex : &quot;Livraison gratuite aujourd&apos;hui&quot;).
        Maximum {MAX_ACTIVE} bannières actives à la fois.
      </p>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-6">
        <div className="flex gap-2">
          <input
            value={newText}
            onChange={e => setNewText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') addBanner() }}
            placeholder="Ex : Livraison gratuite aujourd'hui"
            className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-brand-violet"
          />
          <button
            onClick={addBanner}
            disabled={saving || !newText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-3 rounded-xl font-semibold text-white bg-brand-violet hover:bg-brand-violet-dark transition-colors disabled:opacity-50"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
        {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl divide-y divide-gray-100">
        {banners.length === 0 ? (
          <p className="text-center text-gray-400 py-10 text-sm">Aucune bannière pour le moment</p>
        ) : (
          banners.map(banner => (
            <div key={banner.id} className="flex items-center gap-3 p-4">
              <button
                onClick={() => toggleBanner(banner)}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors shrink-0"
                style={{ backgroundColor: banner.is_active ? '#7C3AED' : '#E5E7EB' }}
                aria-label={banner.is_active ? 'Désactiver' : 'Activer'}
              >
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform"
                  style={{ transform: banner.is_active ? 'translateX(22px)' : 'translateX(2px)' }} />
              </button>
              <p className={`flex-1 text-sm ${banner.is_active ? 'text-gray-900' : 'text-gray-400'}`}>{banner.text}</p>
              <button onClick={() => deleteBanner(banner.id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default function BannersPage() {
  const supabase = createClient()
  const [boutiqueId, setBoutiqueId] = useState<string | null>(null)
  const [plan, setPlan] = useState<PlanKey>('starter')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(async d => {
      if (!d.boutique_id) { setLoading(false); return }
      setBoutiqueId(d.boutique_id)
      const { data: subscription } = await supabase
        .from('subscriptions')
        .select('plan')
        .eq('boutique_id', d.boutique_id)
        .single()
      if (subscription?.plan) setPlan(subscription.plan as PlanKey)
      setLoading(false)
    })
  }, [supabase])

  if (loading) return <p className="text-gray-400 text-sm py-8">Chargement...</p>
  if (!boutiqueId) return null

  return (
    <FeatureGate plan={plan} feature="bannieres" requiredPlanLabel="Starter"
      description="Affichez des bannières promotionnelles au-dessus de votre catalogue pour mettre en avant vos offres et annonces.">
      <BannersManager boutiqueId={boutiqueId} />
    </FeatureGate>
  )
}
