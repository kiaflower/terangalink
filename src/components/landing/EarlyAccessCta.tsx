import Link from 'next/link'
import { Zap } from 'lucide-react'

export function EarlyAccessCta({ initialRemaining }: { initialRemaining: number }) {
  const full = initialRemaining <= 0

  return (
    <Link
      href="/early-access"
      className="inline-flex items-center justify-center gap-2 text-white font-semibold px-6 py-3 rounded-xl text-sm transition-all hover:opacity-90 shadow-lg"
      style={{ backgroundColor: full ? '#111111' : '#F97316', boxShadow: full ? undefined : '0 4px 20px rgba(249,115,22,0.3)' }}
    >
      <Zap className="w-4 h-4" />
      {full ? "Places complètes — Rejoindre la liste d'attente" : `Offre Early Access — ${initialRemaining} place${initialRemaining > 1 ? 's' : ''} restante${initialRemaining > 1 ? 's' : ''}`}
    </Link>
  )
}
