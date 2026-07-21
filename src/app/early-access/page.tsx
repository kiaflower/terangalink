import type { Metadata } from 'next'
import EarlyAccessClient from './EarlyAccessClient'

export const metadata: Metadata = { title: 'Early Access — TerangaSpot' }

export default function EarlyAccessPage() {
  return <EarlyAccessClient />
}
