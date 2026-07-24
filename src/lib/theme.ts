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
  const pageBg = isDark ? '#111111' : isVibrant ? accent : '#FFFFFF'
  const pageText = (isDark || isVibrant) ? '#FFFFFF' : '#111111'
  const cardBg = isDark ? '#1A1A1A' : isVibrant ? withAlpha(accent, '22') : '#F9FAFB'
  const cardBorder = isDark ? '#2A2A2A' : isVibrant ? withAlpha(accent, '33') : '#E5E7EB'
  const subtleText = (isDark || isVibrant) ? 'rgba(255,255,255,0.6)' : '#6B7280'

  return { accent, theme, isDark, isVibrant, pageBg, pageText, cardBg, cardBorder, subtleText }
}
