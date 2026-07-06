interface StoryProgressBarProps {
  count: number
  currentIndex: number
  progress: number
}

export function StoryProgressBar({ count, currentIndex, progress }: StoryProgressBarProps) {
  return (
    <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-1 h-[3px] rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.3)' }}>
          <div
            className="h-full rounded-full bg-white"
            style={{
              width: i < currentIndex ? '100%' : i === currentIndex ? `${progress}%` : '0%',
            }}
          />
        </div>
      ))}
    </div>
  )
}
