import { Check } from 'lucide-react'

interface BadgeCircleProps {
  color: string
  title: string
  size?: number
}

function BadgeCircle({ color, title, size = 16 }: BadgeCircleProps) {
  return (
    <span
      title={title}
      className="inline-flex items-center justify-center rounded-full flex-shrink-0"
      style={{ width: size, height: size, backgroundColor: color }}
    >
      <Check className="text-white" style={{ width: size * 0.65, height: size * 0.65, strokeWidth: 3 }} />
    </span>
  )
}

export function FounderBadge({ size }: { size?: number }) {
  return <BadgeCircle color="#D4AF37" title="Restaurant Fondateur — membre du programme Early Access" size={size} />
}

export function VerifiedBadge({ size }: { size?: number }) {
  return <BadgeCircle color="#2563EB" title="Restaurant Vérifié" size={size} />
}
