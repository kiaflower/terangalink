import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center px-4">
        <h1 className="text-6xl font-bold text-gradient mb-4">404</h1>
        <p className="text-xl text-gray-600 mb-8">Page introuvable</p>
        <Link
          href="/"
          className="inline-block bg-brand-violet text-white px-6 py-3 rounded-xl font-semibold hover:bg-brand-violet-dark transition-colors"
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
