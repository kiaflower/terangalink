/**
 * TerangaLink Theme System
 * Génère les variables CSS pour les pages publiques restaurants avec contraste
 * automatique pour garder textes, cartes et boutons lisibles.
 */

export const DEFAULT_PRIMARY_COLOR = '#F97316'
export const DEFAULT_BUTTON_COLOR = '#F97316'
export const DEFAULT_DARK_BACKGROUND = '#0A0A0A'
export const DEFAULT_LIGHT_BACKGROUND = '#F8F7F4'

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

function normalizeHex(hex: string, fallback = DEFAULT_PRIMARY_COLOR): string {
  const v = (hex || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v.toUpperCase()
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toUpperCase()
  }
  return fallback
}

export function generateThemeTokens(theme: RestaurantTheme): ThemeTokens {
  const mode = theme.mode === 'light' ? 'light' : 'dark'
  const primary = normalizeHex(theme.primary, DEFAULT_PRIMARY_COLOR)
  const button = normalizeHex(theme.button || primary, primary)
  const fallbackBg = mode === 'light' ? DEFAULT_LIGHT_BACKGROUND : DEFAULT_DARK_BACKGROUND
  const bgPage = theme.background ? normalizeHex(theme.background, fallbackBg) : fallbackBg
  const pageIsDark = isDarkColor(bgPage)
  const cardBase = pageIsDark ? mixColors(bgPage, '#FFFFFF', 8) : mixColors(bgPage, '#FFFFFF', 78)
  const cardHover = pageIsDark ? mixColors(bgPage, '#FFFFFF', 13) : mixColors(bgPage, '#000000', 4)
  const inputBg = pageIsDark ? mixColors(bgPage, '#FFFFFF', 12) : mixColors(bgPage, '#000000', 5)
  const textPrimary = readableTextOn(bgPage)
  const textSecondary = withReadableContrast(pageIsDark ? '#A3A3A3' : '#555555', bgPage, textPrimary)
  const textMuted = withReadableContrast(pageIsDark ? '#8A8A8A' : '#6B7280', bgPage, textPrimary)
  const accentText = pickReadableColor(primary, bgPage)

  return {
    bgPage,
    bgCard: cardBase,
    bgCardHover: cardHover,
    bgInput: inputBg,
    bgBadge: cardHover,
    border: pageIsDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)',
    borderStrong: pageIsDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)',
    textPrimary,
    textSecondary,
    textMuted,
    textOnAccent: readableTextOn(primary),
    textOnButton: readableTextOn(button),
    accent: primary,
    accentHover: adjustForHover(primary),
    accentSubtle: hexToRgba(primary, pageIsDark ? 0.14 : 0.10),
    accentText,
    button,
    buttonHover: adjustForHover(button),
    openBg: pageIsDark ? 'rgba(34,197,94,0.14)' : 'rgba(22,163,74,0.12)',
    openText: pageIsDark ? '#86EFAC' : '#15803D',
    closedBg: pageIsDark ? 'rgba(239,68,68,0.14)' : 'rgba(220,38,38,0.12)',
    closedText: pageIsDark ? '#FCA5A5' : '#B91C1C',
  }
}

function hexToRgb(hex: string) {
  const c = normalizeHex(hex).replace('#', '')
  const int = parseInt(c, 16)
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 }
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (Math.round(r) << 16) + (Math.round(g) << 8) + Math.round(b)).toString(16).slice(1)}`.toUpperCase()
}

function relativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex)
  const channels = [r, g, b].map(v => {
    const s = v / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a)
  const l2 = relativeLuminance(b)
  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)
  return (lighter + 0.05) / (darker + 0.05)
}

function isDarkColor(hex: string): boolean {
  return relativeLuminance(hex) < 0.45
}

function readableTextOn(hex: string): string {
  return contrastRatio('#FFFFFF', hex) >= contrastRatio('#111111', hex) ? '#FFFFFF' : '#111111'
}

function pickReadableColor(preferred: string, background: string): string {
  if (contrastRatio(preferred, background) >= 4.5) return preferred
  return readableTextOn(background)
}

function withReadableContrast(preferred: string, background: string, fallback: string): string {
  return contrastRatio(preferred, background) >= 4.5 ? preferred : fallback
}

function mixColors(a: string, b: string, percentB: number): string {
  const ca = hexToRgb(a)
  const cb = hexToRgb(b)
  const p = Math.max(0, Math.min(100, percentB)) / 100
  return rgbToHex(ca.r * (1 - p) + cb.r * p, ca.g * (1 - p) + cb.g * p, ca.b * (1 - p) + cb.b * p)
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function adjustForHover(hex: string): string {
  return isDarkColor(hex) ? mixColors(hex, '#FFFFFF', 12) : mixColors(hex, '#000000', 12)
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
