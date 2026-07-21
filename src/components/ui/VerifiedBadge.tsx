import { Check } from 'lucide-react'

export function VerifiedBadge({ label = 'Vérifié', className = '' }: { label?: string; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${className}`}>
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-500 flex-shrink-0">
        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
      </span>
      {label}
    </span>
  )
}
