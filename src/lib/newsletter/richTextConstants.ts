// Constantes partagées entre l'éditeur riche (client, richText.ts) et le sanitizer
// HTML (serveur, sanitizeHtml.ts) — pas de dépendance Tiptap ici pour rester léger côté serveur.

export const RICH_TEXT_COLORS = [
  { label: 'Orange', value: '#F97316' },
  { label: 'Noir', value: '#111111' },
  { label: 'Gris foncé', value: '#374151' },
  { label: 'Blanc', value: '#FFFFFF' },
] as const

export const RICH_TEXT_SIZES = [
  { label: 'Petit', value: '13px' },
  { label: 'Normal', value: '15px' },
  { label: 'Grand', value: '18px' },
] as const
