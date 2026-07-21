'use client'

import type { NewsletterBlock } from '@/lib/types/database'

type SpacerBlock = Extract<NewsletterBlock, { type: 'spacer' }>

export function SpacerBlockEditor({ block, onChange, disabled }: {
  block: SpacerBlock
  onChange: (patch: Partial<SpacerBlock>) => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range"
        min={8}
        max={96}
        step={4}
        value={block.height}
        disabled={disabled}
        onChange={e => onChange({ height: Number(e.target.value) })}
        className="flex-1 accent-brand-orange"
      />
      <span className="text-xs text-gray-500 w-12 text-right">{block.height}px</span>
    </div>
  )
}
