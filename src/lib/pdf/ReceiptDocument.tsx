import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { PLANS, PlanKey } from '@/lib/plans'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 22, fontFamily: 'Helvetica-Bold', color: '#F97316' },
  subtitle: { marginTop: 4, color: '#6B7280', fontSize: 10 },
  receiptNumber: { fontSize: 15, fontFamily: 'Helvetica-Bold', textAlign: 'right' },
  badge: { fontSize: 9, fontFamily: 'Helvetica-Bold', marginTop: 8, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignSelf: 'flex-end', color: '#047857', backgroundColor: '#D1FAE5' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginTop: 24, marginBottom: 24 },
  confirmBox: { backgroundColor: '#F0FDF4', borderRadius: 10, padding: 20, alignItems: 'center', marginBottom: 24, borderWidth: 1, borderColor: '#D1FAE5' },
  confirmTitle: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#047857' },
  confirmAmount: { fontSize: 24, fontFamily: 'Helvetica-Bold', color: '#047857', marginTop: 6 },
  infoRow: { flexDirection: 'row', gap: 16, marginBottom: 16 },
  infoBox: { flex: 1, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14 },
  infoTitle: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  infoMain: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  infoLine: { fontSize: 10, color: '#4B5563', marginTop: 3 },
  footer: { marginTop: 24, fontSize: 8, color: '#B0B0B0', textAlign: 'center' },
})

interface ReceiptDocumentProps {
  invoiceNumber: string
  restaurantName: string
  contactEmail: string | null
  plan: PlanKey
  periodStart: string
  periodEnd: string
  amountPaid: string
  paymentMethod: string
  paidAt: string
}

// period_start/period_end sont des dates pures (colonne SQL `date`) — les
// parser avec `new Date(str)` les interprète comme minuit UTC, ce qui les
// affiche un jour plus tôt dans un fuseau horaire à l'ouest de Dakar. On
// construit la date à partir de ses composants locaux pour l'éviter.
function formatDateOnly(dateStr: string): string {
  const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function ReceiptDocument({
  invoiceNumber, restaurantName, contactEmail, plan, periodStart, periodEnd, amountPaid, paymentMethod, paidAt,
}: ReceiptDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>TerangaLink</Text>
            <Text style={styles.subtitle}>Reçu de paiement</Text>
          </View>
          <View>
            <Text style={styles.receiptNumber}>{invoiceNumber}</Text>
            <Text style={styles.badge}>Payée</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.confirmBox}>
          <Text style={styles.confirmTitle}>Paiement confirmé</Text>
          <Text style={styles.confirmAmount}>{amountPaid}</Text>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Restaurant</Text>
            <Text style={styles.infoMain}>{restaurantName}</Text>
            {contactEmail && <Text style={styles.infoLine}>{contactEmail}</Text>}
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Paiement</Text>
            <Text style={styles.infoMain}>{paymentMethod}</Text>
            <Text style={styles.infoLine}>Reçu le {formatDateTime(paidAt)}</Text>
          </View>
        </View>

        <View style={styles.infoRow}>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Abonnement</Text>
            <Text style={styles.infoMain}>Plan {PLANS[plan].name}</Text>
            <Text style={styles.infoLine}>Période du {formatDateOnly(periodStart)} au {formatDateOnly(periodEnd)}</Text>
          </View>
          <View style={styles.infoBox}>
            <Text style={styles.infoTitle}>Facture associée</Text>
            <Text style={styles.infoMain}>{invoiceNumber}</Text>
          </View>
        </View>

        <Text style={styles.footer}>TerangaLink — Merci pour votre confiance.</Text>
      </Page>
    </Document>
  )
}
