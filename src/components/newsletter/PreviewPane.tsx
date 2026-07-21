'use client'

import { useEffect, useRef, useState } from 'react'
import type { NewsletterBlock } from '@/lib/types/database'

interface PreviewPaneProps {
  campaignId: string
  blocks: NewsletterBlock[]
  previewText: string | null
}

export function PreviewPane({ campaignId, blocks, previewText }: PreviewPaneProps) {
  const [html, setHtml] = useState('')
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    timeoutRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/super-admin/communication/campaigns/${campaignId}/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks, preview_text: previewText }),
        })
        if (res.ok) {
          const data = await res.json()
          setHtml(data.html)
        }
      } catch {
        // aperçu best-effort — une erreur réseau ne doit pas casser le composeur
      }
    }, 400)
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current) }
  }, [campaignId, blocks, previewText])

  return (
    <iframe title="Aperçu email" srcDoc={html} sandbox="" className="w-full h-full min-h-[500px] bg-white border border-gray-200 rounded-xl" />
  )
}
