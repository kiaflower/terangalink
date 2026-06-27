import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange'
}

export function Badge({ className, variant = 'default', children, ...props }: BadgeProps) {
  const variants = {
    default:  'bg-gray-100 text-gray-500 border border-gray-200',
    success:  'bg-green-50 text-green-700 border border-green-200',
    warning:  'bg-amber-50 text-amber-700 border border-amber-200',
    danger:   'bg-red-50 text-red-700 border border-red-200',
    info:     'bg-blue-50 text-blue-700 border border-blue-200',
    orange:   'bg-orange-50 text-orange-600 border border-orange-200',
  }

  return (
    <span
      className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold', variants[variant], className)}
      {...props}
    >
      {children}
    </span>
  )
}
