export const PDF_REGENERATE_LOCK_MS = 3 * 60 * 60 * 1000

export function formatRegenerateRemaining(ms: number): string {
  const totalMinutes = Math.max(1, Math.ceil(ms / 60000))
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}

export function pdfRegenerateUnlockAt(lastGeneratedAt: string | null): number {
  return lastGeneratedAt ? new Date(lastGeneratedAt).getTime() + PDF_REGENERATE_LOCK_MS : 0
}
