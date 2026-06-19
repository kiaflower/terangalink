'use client'

import { useEffect } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  size = 'md',
}: ModalProps) {
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel — hauteur max + flex column pour scroll interne */}
      <div
        className={cn(
          'relative w-full bg-surface-50 border border-surface-200 rounded-2xl shadow-2xl',
          'flex flex-col animate-fade-in',
          'max-h-[90vh]',
          sizes[size]
        )}
      >
        {/* Header — fixe en haut */}
        {(title || description) && (
          <div className="flex items-start justify-between p-6 border-b border-surface-200 flex-shrink-0">
            <div>
              {title && (
                <h2 className="text-white font-semibold text-lg">{title}</h2>
              )}
              {description && (
                <p className="text-gray-500 text-sm mt-1">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-white transition-colors ml-4 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Content — scrollable */}
        <div className="p-6 overflow-y-auto flex-1">{children}</div>
      </div>
    </div>
  )
}
