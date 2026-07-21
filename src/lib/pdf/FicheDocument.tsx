import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica', color: '#111827' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  brand: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#7C3AED' },
  brandSubtitle: { marginTop: 4, color: '#6B7280', fontSize: 9 },
  numero: { fontSize: 11, fontFamily: 'Helvetica-Bold', textAlign: 'right', color: '#111827' },
  categoryBadge: { fontSize: 8, fontFamily: 'Helvetica-Bold', marginTop: 6, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 10, alignSelf: 'flex-end' },
  divider: { borderBottomWidth: 1, borderBottomColor: '#E5E7EB', marginTop: 20, marginBottom: 20 },
  title: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: '#111827', lineHeight: 1.25 },
  subtitle: { marginTop: 8, fontSize: 12, color: '#6B7280', lineHeight: 1.4 },
  section: { marginTop: 22 },
  sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#7C3AED', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 },
  bodyText: { fontSize: 11, color: '#374151', lineHeight: 1.5 },
  keyPointRow: { flexDirection: 'row', marginBottom: 6, alignItems: 'flex-start' },
  keyPointBullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: '#7C3AED', marginTop: 4, marginRight: 8 },
  keyPointText: { flex: 1, fontSize: 11, color: '#374151', lineHeight: 1.4 },
  exampleBox: { marginTop: 8, backgroundColor: '#F9FAFB', borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#F0F0F0' },
  mistakeBox: { marginTop: 22, backgroundColor: '#FEF2F2', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#DC2626' },
  mistakeTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#B91C1C', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  mistakeText: { fontSize: 11, color: '#7F1D1D', lineHeight: 1.5 },
  actionBox: { marginTop: 14, backgroundColor: '#F0FDF4', borderRadius: 10, padding: 14, borderLeftWidth: 3, borderLeftColor: '#059669' },
  actionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#047857', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  actionText: { fontSize: 11, color: '#064E3B', lineHeight: 1.5 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, color: '#B0B0B0', textAlign: 'center' },
})

function formatNumero(n: number): string {
  return `#${String(n).padStart(3, '0')}`
}

interface FicheDocumentProps {
  numero: number
  categoryCode: string
  categoryName: string
  categoryColor: string
  title: string
  subtitle: string | null
  whyItMatters: string | null
  keyPoints: string[]
  example: string | null
  commonMistake: string | null
  actionStep: string | null
}

export function FicheDocument({
  numero, categoryCode, categoryName, categoryColor,
  title, subtitle, whyItMatters, keyPoints, example, commonMistake, actionStep,
}: FicheDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.brand}>TerangaSpot</Text>
            <Text style={styles.brandSubtitle}>Fiche pratique commerçant</Text>
          </View>
          <View>
            <Text style={styles.numero}>{formatNumero(numero)}</Text>
            <Text style={[styles.categoryBadge, { color: categoryColor, backgroundColor: categoryColor + '1A' }]}>
              {categoryCode} · {categoryName}
            </Text>
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}

        {whyItMatters && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pourquoi c&apos;est important</Text>
            <Text style={styles.bodyText}>{whyItMatters}</Text>
          </View>
        )}

        {keyPoints.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Points clés</Text>
            {keyPoints.map((point, i) => (
              <View key={i} style={styles.keyPointRow}>
                <View style={styles.keyPointBullet} />
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        )}

        {example && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Exemple concret</Text>
            <View style={styles.exampleBox}>
              <Text style={styles.bodyText}>{example}</Text>
            </View>
          </View>
        )}

        {commonMistake && (
          <View style={styles.mistakeBox}>
            <Text style={styles.mistakeTitle}>Erreur fréquente</Text>
            <Text style={styles.mistakeText}>{commonMistake}</Text>
          </View>
        )}

        {actionStep && (
          <View style={styles.actionBox}>
            <Text style={styles.actionTitle}>À faire maintenant</Text>
            <Text style={styles.actionText}>{actionStep}</Text>
          </View>
        )}

        <Text style={styles.footer}>TerangaSpot — Fiche {formatNumero(numero)} — {categoryCode}</Text>
      </Page>
    </Document>
  )
}
