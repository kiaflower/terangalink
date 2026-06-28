import dynamic from 'next/dynamic'

const BoostContent = dynamic(() => import('./BoostContent'), { ssr: false })

export default function BoostPage() {
  return <BoostContent />
}
