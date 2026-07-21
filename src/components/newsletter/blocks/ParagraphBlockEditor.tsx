'use client'

import { useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import type { NewsletterBlock } from '@/lib/types/database'
import { createRichTextExtensions } from '@/lib/newsletter/richText'
import { sanitizeRichText } from '@/lib/newsletter/sanitizeHtml'
import { RichTextToolbar } from '../RichTextToolbar'

type ParagraphBlock = Extract<NewsletterBlock, { type: 'paragraph' }>

export function ParagraphBlockEditor({ block, onChange, disabled }: {
  block: ParagraphBlock
  onChange: (patch: Partial<ParagraphBlock>) => void
  disabled?: boolean
}) {
  const editor = useEditor({
    extensions: createRichTextExtensions(),
    content: block.text,
    editable: !disabled,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange({ text: sanitizeRichText(editor.getHTML()) }),
    editorProps: {
      attributes: { class: 'text-sm text-gray-700 focus:outline-none min-h-[80px]' },
    },
  })

  useEffect(() => { editor?.setEditable(!disabled) }, [disabled, editor])

  return (
    <div>
      <RichTextToolbar editor={editor} disabled={disabled} />
      <div className="border border-gray-200 rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-brand-violet/30">
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
