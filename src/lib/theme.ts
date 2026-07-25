export const DEFAULT_ACCENT = '#F97316'

export const COLOR_PALETTE = [
  '#F97316', '#2563EB', '#059669', '#DC2626',
  '#D97706', '#DB2777', '#0891B2', '#111111',
] as const

export const THEME_OPTIONS = [
  { value: 'light', label: 'Clair', bg: '#FFFFFF', text: '#111111' },
  { value: 'dark', label: 'Sombre', bg: '#111111', text: '#FFFFFF' },
  { value: 'vibrant', label: 'Coloré', bg: 'var(--accent)', text: '#FFFFFF' },
] as const

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export function sanitizeHexColor(input?: string | null, fallback: string = DEFAULT_ACCENT): string {
  return input && HEX_COLOR_RE.test(input) ? input : fallback
}

export function withAlpha(hex: string, alphaHex: string): string {
  const safeHex = HEX_COLOR_RE.test(hex) ? hex : DEFAULT_ACCENT
  return `${safeHex}${alphaHex}`
}

function hexToRgb(hex: string): [number, number, number] {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)]
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)))
  return `#${[r, g, b].map(v => clamp(v).toString(16).padStart(2, '0')).join('')}`
}

// Luminance relative WCAG — sert à choisir un texte lisible (blanc ou sombre)
// quelle que soit la couleur d'accent choisie par le restaurant (presets ou
// couleur personnalisée via le color picker).
function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map(c => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function hexToHsl(hex: string): [number, number, number] {
  const [r, g, b] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0, s = 0
  const d = max - min
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1))
    switch (max) {
      case r: h = ((g - b) / d) % 6; break
      case g: h = (b - r) / d + 2; break
      default: h = (r - g) / d + 4
    }
    h *= 60
    if (h < 0) h += 360
  }
  return [h, s * 100, l * 100]
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = l - c / 2
  let [r, g, b] = [0, 0, 0]
  if (h < 60) [r, g, b] = [c, x, 0]
  else if (h < 120) [r, g, b] = [x, c, 0]
  else if (h < 180) [r, g, b] = [0, c, x]
  else if (h < 240) [r, g, b] = [0, x, c]
  else if (h < 300) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  return rgbToHex((r + m) * 255, (g + m) * 255, (b + m) * 255)
}

// Fond de carte "surélevé" par rapport à `hex` : même teinte, luminosité
// décalée d'un cran fixe pour rester visible sur un fond de page qui est
// lui-même la couleur d'accent (thème "coloré"). `preferDarker` indique le
// sens naturel (assombrir pour un accent sombre + texte blanc, éclaircir
// pour un accent clair + texte sombre) ; si la couleur est déjà proche d'un
// extrême (accent quasi noir ou quasi blanc) et qu'il n'y a pas assez de
// marge dans ce sens, on bascule automatiquement dans l'autre sens plutôt
// que de finir écrasé contre 0 % ou 100 % (ce qui rendrait la carte de
// nouveau indissociable du fond).
function elevatedSurface(hex: string, preferDarker: boolean, delta = 16): string {
  const [h, s, l] = hexToHsl(hex)
  const canGoDown = l >= delta
  const canGoUp = l <= 100 - delta
  const goDown = preferDarker ? canGoDown : !canGoUp
  const newL = goDown ? Math.max(0, l - delta) : Math.min(100, l + delta)
  return hslToHex(h, s, newL)
}

export type ThemeMode = 'light' | 'dark' | 'vibrant'

export interface RestaurantThemeInput {
  primary_color?: string | null
  theme?: string | null
}

export interface RestaurantTheme {
  accent: string
  theme: ThemeMode
  isDark: boolean
  isVibrant: boolean
  pageBg: string
  pageText: string
  cardBg: string
  cardBorder: string
  subtleText: string
}

export function getRestaurantTheme(restaurant: RestaurantThemeInput): RestaurantTheme {
  const accent = sanitizeHexColor(restaurant.primary_color)
  const theme: ThemeMode = restaurant.theme === 'dark' || restaurant.theme === 'vibrant' ? restaurant.theme : 'light'
  const isDark = theme === 'dark'
  const isVibrant = theme === 'vibrant'

  // Thème "coloré" : le fond de page est l'accent lui-même. L'ancien calcul
  // du fond de carte (accent avec une alpha de ~13%, sur un fond qui est
  // exactement ce même accent) donnait une couleur composée identique au
  // fond — les cartes étaient donc invisibles. On choisit ici un texte
  // lisible selon la luminance de l'accent, puis on calcule un fond de
  // carte "surélevé" (voir elevatedSurface) qui reste visible quelle que
  // soit la couleur choisie par le restaurant.
  const vibrantUsesLightText = relativeLuminance(accent) < 0.55

  const pageBg = isDark ? '#111111' : isVibrant ? accent : '#FFFFFF'
  const pageText = isDark ? '#FFFFFF' : isVibrant ? (vibrantUsesLightText ? '#FFFFFF' : '#111111') : '#111111'
  const cardBg = isDark
    ? '#1A1A1A'
    : isVibrant ? elevatedSurface(accent, vibrantUsesLightText) : '#F9FAFB'
  const cardBorder = isDark
    ? '#2A2A2A'
    : isVibrant ? (vibrantUsesLightText ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)') : '#E5E7EB'
  const subtleText = isDark
    ? 'rgba(255,255,255,0.6)'
    : isVibrant ? (vibrantUsesLightText ? 'rgba(255,255,255,0.72)' : 'rgba(17,17,17,0.65)') : '#6B7280'

  return { accent, theme, isDark, isVibrant, pageBg, pageText, cardBg, cardBorder, subtleText }
}
