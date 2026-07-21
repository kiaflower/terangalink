'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { NewsletterBlock } from '@/lib/types/database'
import { createRichTextExtensions } from '@/lib/newsletter/richText'
import { sanitizeRichText } from '@/lib/newsletter/sanitizeHtml'
import { RichTextToolbar } from '../RichTextToolbar'

type TitleBlock = Extract<NewsletterBlock, { type: 'title' }>

export function TitleBlockEditor({ block, onChange, disabled }: {
  block: TitleBlock
  onChange: (patch: Partial<TitleBlock>) => void
  disabled?: boolean
}) {
  const editor = useEditor({
    extensions: createRichTextExtensions(),
    content: block.text,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange({ text: sanitizeRichText(editor.getHTML()) }),
    editorProps: {
      attributes: { class: 'text-sm font-semibold text-gray-900 focus:outline-none' },
    },
  })

  useEffect(() => { editor?.setEditable(!disabled) }, [disabled, editor])

  return (
    <div>
      <RichTextToolbar editor={editor} disabled={disabled} />
      <div className="flex gap-2 items-start">
        <div className="flex-1 border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-orange/30">
          <EditorContent editor={editor} />
        </div>
        <select
          value={block.align ?? 'left'}
          disabled={disabled}
          onChange={e => onChange({ align: e.target.value as 'left' | 'center' | 'right' })}
          className="text-sm border border-gray-200 rounded-lg px-2 py-2 disabled:bg-gray-50"
        >
          <option value="left">Gauche</option>
          <option value="center">Centré</option>
          <option value="right">Droite</option>
        </select>
      </div>
    </div>
  )
}
