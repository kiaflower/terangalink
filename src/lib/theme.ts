export const DEFAULT_ACCENT = '#7C3AED'

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/

export function sanitizeHexColor(input?: string | null, fallback: string = DEFAULT_ACCENT): string {
  return input && HEX_COLOR_RE.test(input) ? input : fallback
}

export function withAlpha(hex: string, alphaHex: string): string {
  const safeHex = HEX_COLOR_RE.test(hex) ? hex : DEFAULT_ACCENT
  return `${safeHex}${alphaHex}`
}

export type ThemeMode = 'light' | 'dark' | 'vibrant'

export interface BoutiqueThemeInput {
  primary_color?: string | null
  theme?: string | null
}

export interface BoutiqueTheme {
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

export function getBoutiqueTheme(boutique: BoutiqueThemeInput): BoutiqueTheme {
  const accent = sanitizeHexColor(boutique.primary_color)
  const theme: ThemeMode = boutique.theme === 'dark' || boutique.theme === 'vibrant' ? boutique.theme : 'light'
  const isDark = theme === 'dark'
  const isVibrant = theme === 'vibrant'
  const pageBg = isDark ? '#111111' : isVibrant ? accent : '#FFFFFF'
  const pageText = (isDark || isVibrant) ? '#FFFFFF' : '#111111'
  const cardBg = isDark ? '#1A1A1A' : isVibrant ? withAlpha(accent, '22') : '#F9FAFB'
  const cardBorder = isDark ? '#2A2A2A' : isVibrant ? withAlpha(accent, '33') : '#E5E7EB'
  const subtleText = (isDark || isVibrant) ? 'rgba(255,255,255,0.6)' : '#6B7280'

  return { accent, theme, isDark, isVibrant, pageBg, pageText, cardBg, cardBorder, subtleText }
}
