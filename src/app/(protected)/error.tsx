'use client'

import { useEffect } from 'react'

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <p className="text-gray-600 text-sm">Une erreur est survenue.</p>
      <button onClick={reset} className="px-4 py-2 rounded-xl text-sm font-semibold text-white" style={{ backgroundColor: '#F97316' }}>
        Réessayer
      </button>
    </div>
  )
}
