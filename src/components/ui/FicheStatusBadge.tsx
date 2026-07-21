import { Badge } from './Badge'

const MAP: Record<string, { label: string; variant: 'default' | 'success' | 'orange' }> = {
  brouillon: { label: 'Brouillon', variant: 'default' },
  prete: { label: 'Prête', variant: 'success' },
  envoyee: { label: 'Envoyée', variant: 'orange' },
}

export function FicheStatusBadge({ status }: { status: string }) {
  const config = MAP[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
