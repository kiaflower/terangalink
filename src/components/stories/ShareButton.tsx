'use client'

import { useState } from 'react'
import { Share2, Check } from 'lucide-react'
import { buildStoryShareUrl } from '@/lib/stories-utils'

export function ShareButton({ storyId }: { storyId: string }) {
  const [copied, setCopied] = useState(false)

  async function handleShare() {
    const url = buildStoryShareUrl(storyId, window.location.origin)
    if (navigator.share) {
      try {
        await navigator.share({ url, title: 'TerangaLink' })
      } catch {
        /* partage annulé par l'utilisateur */
      }
      return
    }
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  return (
    <button
      onClick={handleShare}
      className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 transition-colors"
      style={{ backgroundColor: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
      title="Partager"
    >
      {copied ? <Check className="w-5 h-5 text-white" /> : <Share2 className="w-5 h-5 text-white" />}
    </button>
  )
}
