interface LogoProps {
  iconClassName?: string
  textClassName?: string
  textStyle?: React.CSSProperties
  showText?: boolean
}

export function Logo({ iconClassName = 'w-8 h-8', textClassName = 'font-bold text-xl', textStyle, showText = true }: LogoProps) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.jpg" alt="" className={`${iconClassName} rounded-lg flex-shrink-0 object-cover`} />
      {showText && <span className={textClassName} style={textStyle}>TerangaSpot</span>}
    </span>
  )
}
