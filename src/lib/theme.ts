/**
 * TerangaLink Theme System
 * Génère des tokens CSS lisibles pour les pages publiques restaurants.
 */

export interface RestaurantTheme {
  primary: string
  mode: 'dark' | 'light'
  background?: string
  button?: string
}

export interface ThemeTokens {
  bgPage: string
  bgCard: string
  bgCardHover: string
  bgInput: string
  bgBadge: string
  border: string
  borderStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  textOnAccent: string
  textOnButton: string
  accent: string
  accentHover: string
  accentSubtle: string
  accentText: string
  button: string
  buttonHover: string
  openBg: string
  openText: string
  closedBg: string
  closedText: string
}

function normalizeHex(hex: string | null | undefined, fallback = '#F97316'): string {
  const v = (hex || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  return fallback
}

function getLuminance(hex: string): number {
  const c = normalizeHex(hex).replace('#', '')
  const rgb = [0, 2, 4].map(i => parseInt(c.slice(i, i + 2), 16) / 255)
  const linear = rgb.map(v => v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

function readableTextOn(hex: string): '#111111' | '#FFFFFF' {
  return getLuminance(hex) > 0.45 ? '#111111' : '#FFFFFF'
}

export function generateThemeTokens(theme: RestaurantTheme): ThemeTokens {
  const primary = normalizeHex(theme.primary, '#F97316')
  const mode = theme.mode === 'light' ? 'light' : 'dark'
  const fallbackBg = mode === 'light' ? '#F8F7F4' : '#0A0A0A'
  const background = normalizeHex(theme.background, fallbackBg)
  const button = normalizeHex(theme.button, primary)

  // Priorité stabilité/contraste: si le fond choisi par le Super Admin ne
  // correspond pas au mode, on adapte automatiquement les textes.
  const bgIsLight = getLuminance(background) > 0.45
  const textPrimary = bgIsLight ? '#111111' : '#FFFFFF'
  const textSecondary = bgIsLight ? '#555555' : '#D4D4D4'
  const textMuted = bgIsLight ? '#777777' : '#A3A3A3'

  const darkCards = !bgIsLight
  const card = darkCards ? '#141414' : '#FFFFFF'
  const cardHover = darkCards ? '#1C1C1C' : '#F5F4F1'
  const border = darkCards ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)'
  const borderStrong = darkCards ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.14)'

  return {
    bgPage: background,
    bgCard: card,
    bgCardHover: cardHover,
    bgInput: cardHover,
    bgBadge: cardHover,
    border,
    borderStrong,
    textPrimary,
    textSecondary,
    textMuted,
    textOnAccent: readableTextOn(primary),
    textOnButton: readableTextOn(button),
    accent: primary,
    accentHover: darkenColor(primary, 10),
    accentSubtle: hexToRgba(primary, bgIsLight ? 0.08 : 0.12),
    accentText: bgIsLight ? darkenColor(primary, 15) : primary,
    button,
    buttonHover: darkenColor(button, 10),
    openBg: bgIsLight ? 'rgba(22,163,74,0.10)' : 'rgba(34,197,94,0.12)',
    openText: bgIsLight ? '#16A34A' : '#4ADE80',
    closedBg: bgIsLight ? 'rgba(220,38,38,0.10)' : 'rgba(239,68,68,0.12)',
    closedText: bgIsLight ? '#DC2626' : '#F87171',
  }
}

function hexToRgba(hex: string, alpha: number): string {
  const c = normalizeHex(hex).replace('#', '')
  const int = parseInt(c, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function darkenColor(hex: string, percent: number): string {
  const h = normalizeHex(hex).replace('#', '')
  const num = parseInt(h, 16)
  const r = Math.max(0, (num >> 16) - Math.round(2.55 * percent))
  const g = Math.max(0, ((num >> 8) & 0xff) - Math.round(2.55 * percent))
  const b = Math.max(0, (num & 0xff) - Math.round(2.55 * percent))
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`
}

export function themeToStyle(tokens: ThemeTokens): React.CSSProperties {
  return {
    '--bg-page': tokens.bgPage,
    '--bg-card': tokens.bgCard,
    '--bg-card-hover': tokens.bgCardHover,
    '--bg-input': tokens.bgInput,
    '--border': tokens.border,
    '--border-strong': tokens.borderStrong,
    '--text-primary': tokens.textPrimary,
    '--text-secondary': tokens.textSecondary,
    '--text-muted': tokens.textMuted,
    '--text-on-accent': tokens.textOnAccent,
    '--text-on-button': tokens.textOnButton,
    '--accent': tokens.accent,
    '--accent-hover': tokens.accentHover,
    '--accent-subtle': tokens.accentSubtle,
    '--accent-text': tokens.accentText,
    '--button': tokens.button,
    '--button-hover': tokens.buttonHover,
    '--open-bg': tokens.openBg,
    '--open-text': tokens.openText,
    '--closed-bg': tokens.closedBg,
    '--closed-text': tokens.closedText,
    backgroundColor: tokens.bgPage,
  } as React.CSSProperties
}
