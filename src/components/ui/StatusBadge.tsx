import { Badge } from './Badge'

interface StatusBadgeProps {
  status: string
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const map: Record<string, { label: string; variant: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'orange' }> = {
    pending: { label: 'En attente', variant: 'warning' },
    approved: { label: 'Approuvé', variant: 'success' },
    rejected: { label: 'Rejeté', variant: 'danger' },
    active: { label: 'Actif', variant: 'success' },
    trial: { label: 'Essai', variant: 'orange' },
    overdue: { label: 'En retard', variant: 'warning' },
    paid: { label: 'Payée', variant: 'success' },
    unpaid: { label: 'Non payée', variant: 'warning' },
    suspended: { label: 'Suspendu', variant: 'danger' },
    cancelled: { label: 'Annulé', variant: 'default' },
    confirmed: { label: 'Confirmé', variant: 'info' },
    ready: { label: 'Prêt', variant: 'orange' },
    delivered: { label: 'Livré', variant: 'success' },
  }
  const config = map[status] ?? { label: status, variant: 'default' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
