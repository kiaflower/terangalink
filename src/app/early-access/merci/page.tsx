import Link from 'next/link'
import { Check } from 'lucide-react'

export default function EarlyAccessMerciPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16" style={{ backgroundColor: '#F9FAFB' }}>
      <div className="w-full max-w-md text-center">

        <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6"
          style={{ backgroundColor: '#FFF7ED', border: '3px solid #F97316' }}>
          <Check className="w-10 h-10" style={{ color: '#F97316' }} />
        </div>

        <h1 className="text-3xl font-black mb-4" style={{ color: '#111111' }}>
          Votre place est réservée !
        </h1>
        <p className="text-base mb-2" style={{ color: '#6B7280' }}>
          Votre inscription Early Access a bien été reçue.
        </p>
        <p className="text-base mb-10" style={{ color: '#6B7280' }}>
          Notre équipe va vérifier vos informations et vous contactera sur WhatsApp sous{' '}
          <strong style={{ color: '#111111' }}>24h</strong> pour confirmer votre inscription et les modalités de paiement.
        </p>

        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 w-full py-4 rounded-2xl font-bold text-white transition-opacity hover:opacity-90"
          style={{ backgroundColor: '#F97316' }}
        >
          Retour à l&apos;accueil
        </Link>
      </div>
    </div>
  )
}
