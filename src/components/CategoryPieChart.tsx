import React from 'react'
import type { Transaction } from '../db'

function hashToHsl(str: string) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i)
  h = Math.abs(h)
  const hue = h % 360
  return `hsl(${hue} 70% 50%)`
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const angleRad = ((angleDeg - 90) * Math.PI) / 180.0
  return {
    x: cx + r * Math.cos(angleRad),
    y: cy + r * Math.sin(angleRad)
  }
}

function describeArc(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, endAngle)
  const end = polarToCartesian(cx, cy, r, startAngle)
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1'
  return [`M ${start.x} ${start.y}`, `A ${r} ${r} 0 ${largeArcFlag} 0 ${end.x} ${end.y}`, `L ${cx} ${cy}`, 'Z'].join(' ')
}

export default function CategoryPieChart({ transactions, size = 220, colorMap, showPercentInPie }: { transactions: Transaction[]; size?: number; colorMap?: Record<string, string>; showPercentInPie?: boolean }) {
  // Aggregate totals per category (include incomes like 'Salaire')
  const totals = transactions.reduce((acc: Record<string, number>, t) => {
    const key = t.category || 'Autre'
    acc[key] = (acc[key] || 0) + Math.abs(t.amount)
    return acc
  }, {})

  const entries = Object.entries(totals).sort((a, b) => b[1] - a[1])
  const total = entries.reduce((s, e) => s + e[1], 0)

  if (total === 0) {
    return <div className="p-4 text-center text-sm text-gray-600">Aucune donnée pour le graphique</div>
  }

  const cx = size / 2
  const cy = size / 2
  const r = size / 2 - 2

  let angleStart = 0

  return (
    <div className="flex flex-row items-center gap-6 w-full justify-center">
      {/* Légende à gauche */}
      <div className="flex flex-col gap-2 min-w-[120px]">
        {entries.map(([cat, val]) => {
          const percent = ((val / total) * 100).toFixed(1)
          const color = colorMap?.[cat] || hashToHsl(cat)
          return (
            <div key={cat} className="flex items-center gap-2 text-sm">
              <span style={{ width: 14, height: 14, background: color, display: 'inline-block', borderRadius: 3 }} />
              <span className="font-medium text-gray-700">{cat}</span>
              <span className="text-gray-500 ml-1">{percent}%</span>
            </div>
          )
        })}
      </div>
      {/* Camembert */}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {(() => {
          let angleStart = 0;
          return entries.map(([cat, val], i) => {
            const angle = (val / total) * 360
            const path = describeArc(cx, cy, r, angleStart, angleStart + angle)
            const color = colorMap?.[cat] || hashToHsl(cat)
            const percent = ((val / total) * 100).toFixed(1)
            const midAngle = angleStart + angle / 2
            // Position du pourcentage
            const rad = (midAngle - 90) * Math.PI / 180
            const labelX = cx + Math.cos(rad) * r * 0.7
            const labelY = cy + Math.sin(rad) * r * 0.7
            const slice = (
              <g key={cat}>
                <path d={path} fill={color} stroke="#fff" strokeWidth={1} />
                {showPercentInPie && parseFloat(percent) > 5 && (
                  <text x={labelX} y={labelY} textAnchor="middle" dominantBaseline="middle" fontSize="15" fontWeight="bold" fill="#222">{percent}%</text>
                )}
              </g>
            )
            angleStart += angle
            return slice
          })
        })()}
        <circle cx={cx} cy={cy} r={r * 0.5} fill="#ffffff" />
      </svg>
    </div>
  )
}
