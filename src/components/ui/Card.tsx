import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'bordered' | 'glow'
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

export function Card({ className, variant = 'default', padding = 'md', children, ...props }: CardProps) {
  const variants = {
    default:  'bg-white border border-gray-200',
    bordered: 'bg-white border-2 border-gray-300',
    glow:     'bg-white border border-orange-200 shadow-lg shadow-orange-500/5',
  }
  const paddings = { none: '', sm: 'p-4', md: 'p-6', lg: 'p-8' }

  return (
    <div className={cn('rounded-2xl', variants[variant], paddings[padding], className)} {...props}>
      {children}
    </div>
  )
}

export function CardHeader({ className, children, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn('mb-4', className)} {...props}>{children}</div>
}

export function CardTitle({ className, children, ...props }: HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={cn('text-lg font-semibold text-gray-900', className)} {...props}>{children}</h3>
}
