'use client'

import { useEffect } from 'react'
import { Bell, X } from 'lucide-react'

export interface ToastItem {
  id: string
  title: string
  message?: string
}

interface ToastStackProps {
  toasts: ToastItem[]
  onDismiss: (id: string) => void
  onClickToast?: (toast: ToastItem) => void
}

function ToastCard({ toast, onDismiss, onClick }: { toast: ToastItem; onDismiss: () => void; onClick?: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id])

  return (
    <div
      onClick={onClick}
      className="pointer-events-auto flex items-start gap-3 bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl px-4 py-3.5 w-full max-w-sm cursor-pointer transition-opacity"
    >
      <div className="w-8 h-8 rounded-lg bg-brand-orange/15 flex items-center justify-center flex-shrink-0">
        <Bell className="w-4 h-4 text-brand-orange" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-white font-semibold text-sm">{toast.title}</p>
        {toast.message && <p className="text-gray-400 text-xs mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss() }}
        className="p-1 text-gray-500 hover:text-white transition-colors flex-shrink-0"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export function ToastStack({ toasts, onDismiss, onClickToast }: ToastStackProps) {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastCard
          key={t.id}
          toast={t}
          onDismiss={() => onDismiss(t.id)}
          onClick={onClickToast ? () => onClickToast(t) : undefined}
        />
      ))}
    </div>
  )
}
