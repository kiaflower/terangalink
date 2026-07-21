export type DownloadFichePdfResult =
  | { ok: true; lastGeneratedAt: string }
  | { ok: false; error: string }

/**
 * Fetches the fiche PDF, triggers a browser download, and returns the
 * approximate generation timestamp (the server sets the authoritative one —
 * this is only used to drive the 3h regeneration lock optimistically in the UI).
 */
export async function downloadFichePdf(ficheId: string): Promise<DownloadFichePdfResult> {
  const res = await fetch(`/api/super-admin/fiches/${ficheId}/pdf`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data.error || 'Erreur lors de la génération du PDF' }
  }

  const disposition = res.headers.get('content-disposition') || ''
  const match = disposition.match(/filename="([^"]+)"/)
  const filename = match ? match[1] : `fiche-${ficheId}.pdf`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)

  return { ok: true, lastGeneratedAt: new Date().toISOString() }
}
