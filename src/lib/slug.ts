export function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '')
}

export function slugifyToken(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export function normalizeToken(s: string): string {
  return stripAccents(s.toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ')
}

export function isLooseMatch(a: string, b: string): boolean {
  const na = normalizeToken(a)
  const nb = normalizeToken(b)
  if (!na || !nb) return false
  return na.includes(nb) || nb.includes(na)
}
