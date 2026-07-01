'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'

export interface MonthRow {
  mois: string
  commandes: number
  livrees: number
  revenus: number
  vues: number
}

export interface OrderDetail {
  date: string
  restaurant: string
  client: string
  montant: number
  statut: string
  numero: string
}

export interface RestaurantStat {
  nom: string
  commandes: number
  revenus: number
}

interface Props {
  rows: MonthRow[]
  orderDetails: OrderDetail[]
  restaurantStats: RestaurantStat[]
}

function fmt(n: number) {
  return `${n.toLocaleString('fr-FR')} FCFA`
}

export default function MonthlyHistoryTable({ rows, orderDetails, restaurantStats }: Props) {
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    setExporting(true)
    try {
      const XLSX = await import('xlsx')
      const wb = XLSX.utils.book_new()

      // Feuille 1 — Résumé mensuel
      const ws1 = XLSX.utils.json_to_sheet(rows.map(r => ({
        'Mois': r.mois,
        'Commandes': r.commandes,
        'Commandes livrées': r.livrees,
        'Revenus (FCFA)': r.revenus,
        'Vues': r.vues,
      })))
      XLSX.utils.book_append_sheet(wb, ws1, 'Résumé mensuel')

      // Feuille 2 — Commandes détaillées
      const ws2 = XLSX.utils.json_to_sheet(orderDetails.map(o => ({
        'Date': o.date,
        'Restaurant': o.restaurant,
        'Client': o.client,
        'Montant (FCFA)': o.montant,
        'Statut': o.statut,
        'Numéro': o.numero,
      })))
      XLSX.utils.book_append_sheet(wb, ws2, 'Commandes détaillées')

      // Feuille 3 — Restaurants
      const ws3 = XLSX.utils.json_to_sheet(restaurantStats.map(r => ({
        'Restaurant': r.nom,
        'Commandes totales': r.commandes,
        'Revenus totaux (FCFA)': r.revenus,
      })))
      XLSX.utils.book_append_sheet(wb, ws3, 'Restaurants')

      XLSX.writeFile(wb, `TerangaLink_stats_${new Date().toISOString().slice(0, 7)}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ border: '1px solid #E5E7EB', backgroundColor: '#FFFFFF' }}>
      <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid #F3F4F6' }}>
        <h2 className="font-semibold text-gray-900 text-sm">Historique mensuel (12 mois)</h2>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
          style={{ backgroundColor: '#F97316', color: '#fff' }}
        >
          {exporting
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Download className="w-3.5 h-3.5" />
          }
          Exporter en Excel
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid #F3F4F6' }}>
              {['Mois', 'Commandes', 'Livrées', 'Revenus (FCFA)', 'Vues'].map(h => (
                <th key={h} className={`px-6 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide ${h === 'Mois' ? 'text-left' : 'text-right'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-400 text-sm">Aucune donnée</td>
              </tr>
            ) : rows.map((row, i) => (
              <tr key={row.mois} className={i === 0 ? 'bg-orange-50/50' : 'hover:bg-gray-50'}>
                <td className="px-6 py-3 text-gray-900 font-medium capitalize">{row.mois}</td>
                <td className="px-6 py-3 text-right text-gray-700">{row.commandes}</td>
                <td className="px-6 py-3 text-right text-gray-700">{row.livrees}</td>
                <td className="px-6 py-3 text-right text-gray-700 font-semibold">{fmt(row.revenus)}</td>
                <td className="px-6 py-3 text-right text-gray-500">{row.vues.toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
