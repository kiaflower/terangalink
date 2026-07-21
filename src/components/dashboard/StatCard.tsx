import { cn } from '@/lib/utils'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: React.ReactNode
  trend?: { value: number; positive: boolean }
  color?: 'violet' | 'green' | 'blue' | 'amber'
}

export function StatCard({ title, value, subtitle, icon, trend, color = 'violet' }: StatCardProps) {
  const colors = {
    violet: { icon: 'bg-brand-violet/10 text-brand-violet', border: 'border-brand-violet/10' },
    green: { icon: 'bg-green-500/10 text-green-400', border: 'border-green-500/10' },
    blue: { icon: 'bg-blue-500/10 text-blue-400', border: 'border-blue-500/10' },
    amber: { icon: 'bg-amber-500/10 text-amber-400', border: 'border-amber-500/10' },
  }

  return (
    <div className={cn('bg-gray-50 border rounded-2xl p-5 flex flex-col gap-3', colors[color].border)}>
      <div className="flex items-center justify-between">
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center', colors[color].icon)}>
          {icon}
        </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-900 tracking-tight">{value}</p>
        {subtitle && <p className="text-gray-500 text-xs mt-1">{subtitle}</p>}
      </div>
      {trend && (
        <div className="flex items-center gap-1">
          <span className={cn('text-xs font-semibold', trend.positive ? 'text-green-500' : 'text-red-400')}>
            {trend.positive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-gray-500 text-xs">ce mois</span>
        </div>
      )}
    </div>
  )
}
