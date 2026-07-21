'use client'

import type { Editor } from '@tiptap/react'
import { Bold, Italic, Underline } from 'lucide-react'
import { RICH_TEXT_COLORS, RICH_TEXT_SIZES } from '@/lib/newsletter/richText'

interface RichTextToolbarProps {
  editor: Editor | null
  disabled?: boolean
}

export function RichTextToolbar({ editor, disabled }: RichTextToolbarProps) {
  if (!editor) return null

  const activeSize = RICH_TEXT_SIZES.find(s => editor.isActive('textStyle', { fontSize: s.value }))?.value ?? RICH_TEXT_SIZES[1].value
  const activeColor = editor.getAttributes('textStyle').color as string | undefined

  return (
    <div className="flex flex-wrap items-center gap-1 mb-2 pb-2 border-b border-gray-100">
      <ToolbarButton
        active={editor.isActive('bold')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleBold().run()}
        label="Gras"
      >
        <Bold className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('italic')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        label="Italique"
      >
        <Italic className="w-3.5 h-3.5" />
      </ToolbarButton>
      <ToolbarButton
        active={editor.isActive('underline')}
        disabled={disabled}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        label="Souligné"
      >
        <Underline className="w-3.5 h-3.5" />
      </ToolbarButton>

      <span className="w-px h-4 bg-gray-200 mx-1" />

      {RICH_TEXT_COLORS.map(c => (
        <button
          key={c.value}
          type="button"
          disabled={disabled}
          title={c.label}
          onClick={() => editor.chain().focus().setColor(c.value).run()}
          className={`w-5 h-5 rounded-full border transition-transform ${activeColor === c.value ? 'ring-2 ring-brand-violet ring-offset-1' : 'border-gray-200'}`}
          style={{ backgroundColor: c.value }}
        />
      ))}

      <span className="w-px h-4 bg-gray-200 mx-1" />

      {RICH_TEXT_SIZES.map(s => (
        <button
          key={s.value}
          type="button"
          disabled={disabled}
          onClick={() => editor.chain().focus().setFontSize(s.value).run()}
          className={`text-xs font-medium rounded-md px-2 py-1 transition-colors ${
            activeSize === s.value ? 'bg-brand-violet/10 text-brand-violet' : 'text-gray-500 hover:bg-gray-50'
          }`}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function ToolbarButton({ active, disabled, onClick, label, children }: {
  active: boolean
  disabled?: boolean
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-md transition-colors ${
        active ? 'bg-brand-violet/10 text-brand-violet' : 'text-gray-500 hover:bg-gray-50'
      }`}
    >
      {children}
    </button>
  )
}
