import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PLANS, PlanKey } from '@/lib/plans'

const STATUS_STYLES: Record<string, { label: string; color: string; bg: string }> = {
  unpaid: { label: 'Non payée', color: '#B45309', bg: '#FEF3C7' },
  paid: { label: 'Payée', color: '#047857', bg: '#D1FAE5' },
  overdue: { label: 'En retard', color: '#B91C1C', bg: '#FEE2E2' },
}

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#F97316' },
  subtitle: { marginTop: 4, color: '#6B7280', fontSize: 10 },
  invoiceNumber: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  statusBadge: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignSelf: 'flex-end' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginTop: 24, marginBottom: 24 },
  infoRow: { flexDirection: 'row', gap: 16, marginBottom: 24 },
  infoBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14 },
  infoTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  infoMain: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  infoLine: { fontSize: 10, color: '#4B5563', marginTop: 3 },
  table: { borderWidth: 1, borderColor: '#E5E7EB', borderRadius: 10, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#F9FAFB', paddingVertical: 8, paddingHorizontal: 14 },
  tableHeaderText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1 },
  tableRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  tableLabel: { color: '#374151' },
  tableValue: { fontFamily: 'Helvetica-Bold', color: '#111827' },
  discountLabel: { color: '#047857' },
  discountValue: { color: '#047857', fontFamily: 'Helvetica-Bold' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F5F3FF', paddingVertical: 14, paddingHorizontal: 14, borderTopWidth: 1, borderTopColor: '#E5E7EB' },
  totalLabel: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827' },
  totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#F97316' },
  paymentBox: { marginTop: 28, backgroundColor: '#FAFAFA', borderRadius: 10, padding: 16, borderWidth: 1, borderColor: '#F0F0F0' },
  paymentTitle: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  paymentText: { fontSize: 10, color: '#4B5563', lineHeight: 1.4 },
  paymentNumber: { fontFamily: 'Helvetica-Bold', color: '#F97316' },
  footer: { marginTop: 24, fontSize: 8, color: '#B0B0B0', textAlign: 'center' },
})

interface InvoiceDocumentProps {
  invoiceNumber: string
  boutiqueName: string
  contactEmail: string | null
  periodStart: string
  periodEnd: string
  plan: PlanKey
  fullAmount: number
  discountAmount: number
  discountReason: string | null
  finalAmount: number
  status: string
  generatedAt: string
  dueAt: string
  paymentNumber: string
}

function formatFcfa(amount: number): string {
  const withSpaces = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  return `${withSpaces} FCFA`
}

// period_start/period_end sont des dates pures (colonne SQL `date`, sans heure) —
// les parser avec `new Date(iso)` les interprète comme minuit UTC, ce qui les
// affiche un jour plus tôt dans tout fuseau horaire à l'ouest de Dakar. On
// construit donc la date à partir de ses composants locaux, jamais via UTC.
function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function InvoiceDocument({
  invoiceNumber, boutiqueName, contactEmail, periodStart, periodEnd, plan,
  fullAmount, discountAmount, discountReason, finalAmount, status, generatedAt, dueAt, paymentNumber,
}: InvoiceDocumentProps) {
  const statusStyle = STATUS_STYLES[status] ?? { label: status, color: '#374151', bg: '#F3F4F6' }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>TerangaSpot</Text>
            <Text style={styles.subtitle}>Facture d&apos;abonnement</Text>
          </View>
          <View>
            <Text style={styles.invoiceNumber}>{invoiceNumber}</Text>
            <Text style={[styles.statusBadge, { color: statusStyle.color, backgroundColor: statusStyle.bg }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Boutique</Text>
            <Text style={styles.infoMain}>{boutiqueName}</Text>
            {contactEmail && <Text style={styles.infoLine}>{contactEmail}</Text>}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Période</Text>
            <Text style={styles.infoMain}>Du {formatDateOnly(periodStart)} au {formatDateOnly(periodEnd)}</Text>
            <Text style={styles.infoLine}>Générée le {formatDateTime(generatedAt)}</Text>
            <Text style={styles.infoLine}>Échéance le {formatDateTime(dueAt)}</Text>
          </View>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableHeaderText}>Détail</Text>
            <Text style={styles.tableHeaderText}>Montant</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={styles.tableLabel}>Plan {PLANS[plan].name}</Text>
            <Text style={styles.tableValue}>{formatFcfa(fullAmount)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={styles.tableRow}>
              <Text style={styles.discountLabel}>{discountReason ?? 'Réduction'}</Text>
              <Text style={styles.discountValue}>-{formatFcfa(discountAmount)}</Text>
            </View>
          )}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Montant dû</Text>
            <Text style={styles.totalValue}>{formatFcfa(finalAmount)}</Text>
          </View>
        </View>

        <View style={styles.paymentBox}>
          <Text style={styles.paymentTitle}>Comment payer ?</Text>
          <Text style={styles.paymentText}>
            Paiement par Wave ou Orange Money au <Text style={styles.paymentNumber}>{paymentNumber}</Text>.
          </Text>
        </View>

        <Text style={styles.footer}>TerangaSpot — {invoiceNumber}</Text>
      </Page>
    </Document>
  )
}
