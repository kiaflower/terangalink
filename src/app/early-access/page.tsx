import type { Metadata } from 'next'
import EarlyAccessClient from './EarlyAccessClient'

export const metadata: Metadata = { title: 'Early Access — TerangaLink' }

export default function EarlyAccessPage() {
  return <EarlyAccessClient />
}
