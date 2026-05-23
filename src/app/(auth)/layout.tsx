export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-surface flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-orange-glow opacity-30 pointer-events-none" />
      <div className="relative w-full max-w-md">{children}</div>
    </div>
  )
}
