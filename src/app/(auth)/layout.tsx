export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at center, rgba(249,115,22,0.06) 0%, transparent 70%)' }} />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
