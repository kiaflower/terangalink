import { Navigation, MapPin, ExternalLink } from 'lucide-react'
import type { ThemeTokens } from '@/lib/theme'

interface GoogleMapProps {
  address: string
  city?: string
  latitude?: number | null
  longitude?: number | null
  tokens?: ThemeTokens
  className?: string
}

/**
 * Simplified map component — no embed iframe.
 * Just the address + two action buttons:
 * - Itinéraire (opens Google Maps directions)
 * - Ouvrir (opens the location in Google Maps)
 */
export function GoogleMap({
  address,
  city = 'Dakar',
  latitude,
  longitude,
  tokens,
  className,
}: GoogleMapProps) {
  const fullAddress = `${address}, ${city}, Sénégal`
  const encodedAddress = encodeURIComponent(fullAddress)

  const directionsUrl = latitude && longitude
    ? `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`
    : `https://www.google.com/maps/dir/?api=1&destination=${encodedAddress}`

  const searchUrl = latitude && longitude
    ? `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`
    : `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`

  const bgColor = tokens?.bgCard || '#141414'
  const borderColor = tokens?.border || 'rgba(255,255,255,0.08)'
  const accentColor = tokens?.accent || '#F97316'
  const textPrimary = tokens?.textPrimary || '#FFFFFF'
  const textSecondary = tokens?.textSecondary || '#A3A3A3'

  return (
    <div
      className={`rounded-2xl p-4 ${className || ''}`}
      style={{ backgroundColor: bgColor, border: `1px solid ${borderColor}` }}
    >
      {/* Address row */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accentColor}15` }}
        >
          <MapPin className="w-4 h-4" style={{ color: accentColor }} />
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: textPrimary }}>{address}</p>
          <p className="text-xs mt-0.5" style={{ color: textSecondary }}>{city}, Sénégal</p>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{ backgroundColor: accentColor, color: '#FFFFFF' }}
        >
          <Navigation className="w-4 h-4" />
          Itinéraire
        </a>
        <a
          href={searchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
          style={{
            backgroundColor: `${accentColor}12`,
            color: accentColor,
            border: `1px solid ${accentColor}25`,
          }}
        >
          <ExternalLink className="w-3.5 h-3.5" />
          Ouvrir
        </a>
      </div>
    </div>
  )
}
