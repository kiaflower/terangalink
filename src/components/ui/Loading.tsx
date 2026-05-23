import { cn } from '@/lib/utils'

export function Spinner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-surface-300 border-t-brand-orange',
        className ?? 'w-6 h-6'
      )}
    />
  )
}

export function PageLoader() {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner className="w-10 h-10" />
        <p className="text-gray-500 text-sm">Chargement...</p>
      </div>
    </div>
  )
}

export function SkeletonCard() {
  return (
    <div className="bg-surface-50 border border-surface-200 rounded-2xl p-6 animate-pulse">
      <div className="h-4 bg-surface-300 rounded-full w-1/3 mb-3" />
      <div className="h-8 bg-surface-300 rounded-full w-2/3 mb-2" />
      <div className="h-3 bg-surface-200 rounded-full w-1/2" />
    </div>
  )
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-4 py-4 border-b border-surface-200 animate-pulse">
      <div className="w-10 h-10 bg-surface-300 rounded-full flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3.5 bg-surface-300 rounded-full w-1/3" />
        <div className="h-3 bg-surface-200 rounded-full w-1/4" />
      </div>
      <div className="h-6 bg-surface-300 rounded-full w-16" />
    </div>
  )
}

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && (
        <div className="w-16 h-16 bg-surface-100 rounded-2xl flex items-center justify-center mb-4 text-gray-600">
          {icon}
        </div>
      )}
      <h3 className="text-white font-semibold text-lg mb-2">{title}</h3>
      {description && (
        <p className="text-gray-500 text-sm max-w-sm mb-6">{description}</p>
      )}
      {action}
    </div>
  )
}
