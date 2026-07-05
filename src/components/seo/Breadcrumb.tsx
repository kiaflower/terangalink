import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbEntry {
  label: string
  href?: string
}

interface Props {
  items: BreadcrumbEntry[]
}

export function Breadcrumb({ items }: Props) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Fil d'ariane" className="flex items-center flex-wrap gap-1 text-xs sm:text-sm text-gray-500 mb-4">
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={`${item.label}-${i}`} className="flex items-center gap-1">
            {i > 0 && <ChevronRight className="w-3 h-3 shrink-0" />}
            {item.href && !isLast ? (
              <Link href={item.href} className="hover:text-white transition-colors">
                {item.label}
              </Link>
            ) : (
              <span className={isLast ? 'text-white font-medium' : ''}>{item.label}</span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
