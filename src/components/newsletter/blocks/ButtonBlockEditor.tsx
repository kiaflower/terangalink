'use client'

import type { NewsletterBlock } from '@/lib/types/database'

type ButtonBlock = Extract<NewsletterBlock, { type: 'button' }>

export function ButtonBlockEditor({ block, onChange, disabled }: {
  block: ButtonBlock
  onChange: (patch: Partial<ButtonBlock>) => void
  disabled?: boolean
}) {
  return (
    <div className="space-y-2">
      <input
        value={block.text}
        disabled={disabled}
        onChange={e => onChange({ text: e.target.value })}
        placeholder="Texte du bouton"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 disabled:bg-gray-50"
      />
      <input
        value={block.url}
        disabled={disabled}
        onChange={e => onChange({ url: e.target.value })}
        placeholder="https://…"
        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-orange/30 disabled:bg-gray-50"
      />
    </div>
  )
}
