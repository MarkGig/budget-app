import React from 'react'


interface LineChartProps {
  data: Array<{ month: string; expenses: number; income?: number; chequing?: number }>
  chequingMode?: boolean
}

export default function LineChart({ data, chequingMode = false }: LineChartProps) {
  if (data.length === 0) return <div className="text-gray-500">Pas de données</div>

  // For chequingMode, use chequing instead of income
  const maxValue = Math.max(
    ...data.flatMap(d => [d.expenses, chequingMode ? (d.chequing ?? 0) : (d.income ?? 0)])
  )
  if (maxValue === 0) return <div className="text-gray-500">Pas de données</div>

  const padding = 60
  const svgWidth = 1000
  const svgHeight = 300
  const chartWidth = svgWidth - padding * 2
  const chartHeight = svgHeight - padding * 2

  const getX = (index: number) => padding + (index / Math.max(data.length - 1, 1)) * chartWidth
  const getY = (value: number) => padding + chartHeight - (value / maxValue) * chartHeight

  const expensePoints = data.map((d, i) => `${getX(i)},${getY(d.expenses)}`).join(' ')
  const chequingPoints = data.map((d, i) => `${getX(i)},${getY(chequingMode ? (d.chequing ?? 0) : (d.income ?? 0))}`).join(' ')

  return (
    <div className="w-full overflow-x-auto bg-white p-4 rounded-lg border border-gray-200">
      <svg width={svgWidth} height={svgHeight} className="min-w-full">
        {/* Grille */}
        {Array.from({ length: 5 }, (_, i) => {
          const y = padding + (chartHeight / 4) * i
          const gridValue = maxValue - (maxValue / 4) * i
          return (
            <g key={`grid-${i}`}>
              <line x1={padding} y1={y} x2={svgWidth - padding} y2={y} stroke="#f0f0f0" strokeWidth="1" />
              <text x={padding - 10} y={y + 5} fontSize="13" fill="#999" textAnchor="end">
                ${gridValue.toFixed(0)}
              </text>
            </g>
          )
        })}

        {/* Axes */}
        <line x1={padding} y1={padding} x2={padding} y2={svgHeight - padding} stroke="#333" strokeWidth="2" />
        <line x1={padding} y1={svgHeight - padding} x2={svgWidth - padding} y2={svgHeight - padding} stroke="#333" strokeWidth="2" />

        {/* Lignes */}
        <polyline points={expensePoints} fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        <polyline points={chequingPoints} fill="none" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* Points dépenses */}
        {data.map((d, i) => (
          <circle key={`exp-${i}`} cx={getX(i)} cy={getY(d.expenses)} r="3" fill="#ef4444" />
        ))}

        {/* Points solde chèque ou revenus */}
        {data.map((d, i) => (
          <circle key={`inc-${i}`} cx={getX(i)} cy={getY(chequingMode ? (d.chequing ?? 0) : (d.income ?? 0))} r="3" fill="#10b981" />
        ))}

        {/* Labels X-axis */}
        {data.map((d, i) => {
          if (data.length > 12 && i % 3 !== 0) return null
          return (
            <text key={`lbl-${i}`} x={getX(i)} y={svgHeight - padding + 25} fontSize="12" fill="#666" textAnchor="middle">
              {d.month.slice(0, 3)}
            </text>
          )
        })}

        {/* Légende */}
        <g>
          <rect x={padding} y={15} width={12} height={12} fill="#ef4444" />
          <text x={padding + 18} y={24} fontSize="12" fill="#333">
            Dépenses
          </text>

          <rect x={padding + 140} y={15} width={12} height={12} fill="#10b981" />
          <text x={padding + 158} y={24} fontSize="12" fill="#333">
            {chequingMode ? 'Solde Chèque' : 'Revenus'}
          </text>
        </g>
      </svg>
    </div>
  )
}
