'use client'

interface Counts {
  brouillon: number
  prete: number
  envoyee: number
}

export function FichesProgressGauge({ counts }: { counts: Counts }) {
  const total = counts.brouillon + counts.prete + counts.envoyee
  if (total === 0) return null

  const pct = (n: number) => (n / total) * 100

  return (
    <div className="mb-6">
      <p className="text-xs text-gray-500 mb-2">
        <span className="font-semibold text-brand-violet">{counts.envoyee}</span> envoyée{counts.envoyee !== 1 ? 's' : ''}
        {' · '}
        <span className="font-semibold text-green-600">{counts.prete}</span> prête{counts.prete !== 1 ? 's' : ''}
        {' · '}
        <span className="font-semibold text-gray-500">{counts.brouillon}</span> brouillon{counts.brouillon !== 1 ? 's' : ''}
        {' sur '}{total}
      </p>
      <div className="w-full h-2 rounded-full bg-gray-100 overflow-hidden flex">
        {counts.brouillon > 0 && <div style={{ width: `${pct(counts.brouillon)}%`, backgroundColor: '#D1D5DB' }} />}
        {counts.prete > 0 && <div style={{ width: `${pct(counts.prete)}%`, backgroundColor: '#059669' }} />}
        {counts.envoyee > 0 && <div style={{ width: `${pct(counts.envoyee)}%`, backgroundColor: '#7C3AED' }} />}
      </div>
    </div>
  )
}
