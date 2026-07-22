'use client'

import { useEffect, useRef, useState } from 'react'
import type { NewsletterSegment } from '@/lib/types/database'

const PRESETS: { type: 'all' | 'pro' | 'starter' | 'founder' | 'trial' | 'inactive'; label: string; description: string }[] = [
  { type: 'all', label: 'Toutes les restaurants', description: 'Toutes les restaurants ayant accepté de recevoir la newsletter.' },
  { type: 'pro', label: 'Restaurants Pro', description: 'Abonnement Pro actif.' },
  { type: 'starter', label: 'Restaurants Starter', description: 'Abonnement Starter actif.' },
  { type: 'founder', label: 'Restaurants fondatrices', description: 'Badge Early Access / fondateur.' },
  { type: 'trial', label: "Restaurants en période d'essai", description: 'Abonnement en statut essai.' },
  { type: 'inactive', label: 'Restaurants inactifs', description: 'Aucune connexion au dashboard depuis 30 jours.' },
]

interface SegmentPickerProps {
  campaignId: string
  segment: NewsletterSegment
  onChange: (segment: NewsletterSegment) => void
  disabled?: boolean
}

export function SegmentPicker({ campaignId, segment, onChange, disabled }: SegmentPickerProps) {
  const [count, setCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    setLoadingCount(true)
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}/recipients-count`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ segment }),
        })
        if (res.ok) {
          const data = await res.json()
          setCount(data.count)
        }
      } finally {
        setLoadingCount(false)
      }
    }, 300)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [campaignId, segment])

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-2">
        {PRESETS.map(preset => (
          <label
            key={preset.type}
            className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${segment.type === preset.type ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-200 hover:border-gray-300'}`}
          >
            <input
              type="radio"
              name="segment"
              className="mt-0.5 accent-brand-orange"
              disabled={disabled}
              checked={segment.type === preset.type}
              onChange={() => onChange({ type: preset.type })}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">{preset.label}</span>
              <span className="block text-xs text-gray-400">{preset.description}</span>
            </span>
          </label>
        ))}
        <label className={`flex items-start gap-2 border rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${segment.type === 'custom' ? 'border-brand-orange bg-brand-orange/5' : 'border-gray-200 hover:border-gray-300'}`}>
          <input
            type="radio"
            name="segment"
            className="mt-0.5 accent-brand-orange"
            disabled={disabled}
            checked={segment.type === 'custom'}
            onChange={() => onChange({ type: 'custom', plan: 'any', active: 'any', registeredBefore: null, registeredAfter: null })}
          />
          <span>
            <span className="block text-sm font-medium text-gray-900">Segment personnalisé</span>
            <span className="block text-xs text-gray-400">Combiner plan, statut et date d&apos;inscription.</span>
          </span>
        </label>
      </div>

      {segment.type === 'custom' && (
        <div className="grid sm:grid-cols-2 gap-3 border border-gray-200 rounded-lg p-3 bg-gray-50">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Plan</label>
            <select
              disabled={disabled}
              value={segment.plan ?? 'any'}
              onChange={e => onChange({ ...segment, plan: e.target.value as 'starter' | 'pro' | 'any' })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="any">Tous</option>
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
            <select
              disabled={disabled}
              value={segment.active === true ? 'active' : segment.active === false ? 'inactive' : 'any'}
              onChange={e => onChange({ ...segment, active: e.target.value === 'active' ? true : e.target.value === 'inactive' ? false : 'any' })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            >
              <option value="any">Tous</option>
              <option value="active">Actives</option>
              <option value="inactive">Inactives</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Inscrites après le</label>
            <input
              type="date"
              disabled={disabled}
              value={segment.registeredAfter?.slice(0, 10) ?? ''}
              onChange={e => onChange({ ...segment, registeredAfter: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Inscrites avant le</label>
            <input
              type="date"
              disabled={disabled}
              value={segment.registeredBefore?.slice(0, 10) ?? ''}
              onChange={e => onChange({ ...segment, registeredBefore: e.target.value ? new Date(e.target.value).toISOString() : null })}
              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5"
            />
          </div>
        </div>
      )}

      <div className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        {loadingCount ? 'Calcul du nombre de destinataires…' : (
          <>
            <strong className="text-gray-900">{count ?? 0}</strong> destinataire{(count ?? 0) !== 1 ? 's' : ''} recevront cette campagne (restaurants ayant accepté la newsletter uniquement).
          </>
        )}
      </div>
    </div>
  )
}
