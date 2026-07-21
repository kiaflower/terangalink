'use client'

import { useParams } from 'next/navigation'
import { FicheForm } from '../FicheForm'

export default function EditFichePage() {
  const params = useParams()
  const id = params.id as string
  return <FicheForm ficheId={id} />
}
