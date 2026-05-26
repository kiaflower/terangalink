/**
 * TerangaLink Theme System
 * Génère les variables CSS pour les pages publiques restaurants.
 */

export interface RestaurantTheme {
  primary: string
  mode: 'dark' | 'light'
  background?: string
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

  accent: string
  accentHover: string
  accentSubtle: string
  accentText: string

  openBg: string
  openText: string
  closedBg: string
  closedText: string
}

function normalizeHex(hex: string, fallback = '#F97316'): string {
  const v = (hex || '').trim()
  if (/^#[0-9A-Fa-f]{6}$/.test(v)) return v
  if (/^#[0-9A-Fa-f]{3}$/.test(v)) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`
  }
  return fallback
}

export function generateThemeTokens(theme: RestaurantTheme): ThemeTokens {
  const primary = normalizeHex(theme.primary, '#F97316')
  const background = theme.background ? normalizeHex(theme.background, '#0A0A0A') : undefined
  const mode = theme.mode === 'light' ? 'light' : 'dark'

  if (mode === 'dark') {
    return {
      bgPage: background || '#0A0A0A',
      bgCard: '#141414',
      bgCardHover: '#1C1C1C',
      bgInput: '#1C1C1C',
      bgBadge: '#1C1C1C',
      border: 'rgba(255,255,255,0.08)',
      borderStrong: 'rgba(255,255,255,0.14)',
      textPrimary: '#FFFFFF',
      textSecondary: '#A3A3A3',
      textMuted: '#6B6B6B',
      textOnAccent: '#FFFFFF',
      accent: primary,
      accentHover: darkenColor(primary, 10),
      accentSubtle: hexToRgba(primary, 0.10),
      accentText: primary,
      openBg: 'rgba(34,197,94,0.12)',
      openText: '#4ADE80',
      closedBg: 'rgba(239,68,68,0.12)',
      closedText: '#F87171',
    }
  }

  return {
    bgPage: background || '#F8F7F4',
    bgCard: '#FFFFFF',
    bgCardHover: '#F5F4F1',
    bgInput: '#F5F4F1',
    bgBadge: '#F0EEE9',
    border: 'rgba(0,0,0,0.08)',
    borderStrong: 'rgba(0,0,0,0.14)',
    textPrimary: '#111111',
    textSecondary: '#555555',
    textMuted: '#888888',
    textOnAccent: '#FFFFFF',
    accent: primary,
    accentHover: darkenColor(primary, 10),
    accentSubtle: hexToRgba(primary, 0.08),
    accentText: darkenColor(primary, 15),
    openBg: 'rgba(22,163,74,0.10)',
    openText: '#16A34A',
    closedBg: 'rgba(220,38,38,0.10)',
    closedText: '#DC2626',
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
    '--accent': tokens.accent,
    '--accent-hover': tokens.accentHover,
    '--accent-subtle': tokens.accentSubtle,
    '--accent-text': tokens.accentText,
    '--open-bg': tokens.openBg,
    '--open-text': tokens.openText,
    '--closed-bg': tokens.closedBg,
    '--closed-text': tokens.closedText,
    backgroundColor: tokens.bgPage,
  } as React.CSSProperties
}