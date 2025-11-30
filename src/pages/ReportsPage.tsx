import React, { useEffect, useMemo, useState } from 'react'
import type { Transaction, Account } from '../db'
import { getTransactions, getAccounts } from '../db'
import CategoryPieChart from '../components/CategoryPieChart'

type PeriodType = 'weekly' | 'monthly' | 'yearly'

function getDateRangeForPeriod(period: PeriodType, year: number, month?: number, week?: number): [string, string] {
  if (period === 'yearly') return [new Date(year, 0, 1).toISOString().slice(0, 10), new Date(year, 11, 31).toISOString().slice(0, 10)]
  if (period === 'monthly' && typeof month === 'number') {
    const start = new Date(year, month - 1, 1).toISOString().slice(0, 10)
    const end = new Date(year, month, 0).toISOString().slice(0, 10)
    return [start, end]
  }
  if (period === 'weekly' && typeof week === 'number') {
    const simple = new Date(year, 0, 4)
    const ISOweekStart = new Date(simple.getTime())
    const day = ISOweekStart.getDay() || 7
    ISOweekStart.setDate(ISOweekStart.getDate() - (day - 1))
    ISOweekStart.setDate(ISOweekStart.getDate() + (week - 1) * 7)
    const start = ISOweekStart.toISOString().slice(0, 10)
    const end = new Date(ISOweekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
    return [start, end]
  }
  return ['', '']
}

function buildLabelsForPeriod(period: PeriodType, startDate: string, endDate: string, selectedYear: number, selectedMonth?: number, selectedWeek?: number) {
  if (period === 'yearly') {
    return Array.from({ length: 12 }, (_, i) => new Date(selectedYear, i, 1).toLocaleDateString('fr-CA', { month: 'short' }))
  }
  if (period === 'monthly' && typeof selectedMonth === 'number') {
    const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate()
    const weeks = Math.ceil(daysInMonth / 7)
    return Array.from({ length: weeks }, (_, i) => `S${i + 1}`)
  }
  const s = new Date(startDate)
  const labels: string[] = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(s)
    d.setDate(s.getDate() + i)
    labels.push(d.toLocaleDateString('fr-CA', { weekday: 'short' }))
  }
  return labels
}

function GroupedBarChart({ categories, labels, values, itemsByCategoryLabel, colorMap }: { categories: string[]; labels: string[]; values: number[][]; itemsByCategoryLabel: Transaction[][][]; colorMap: Record<string, string> }) {
  const width = 960
  const height = 260
  const padding = { top: 20, right: 12, bottom: 50, left: 48 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom

  const max = Math.max(1, ...values.flat())
  const groupWidth = labels.length ? innerW / labels.length : innerW
  const barWidth = Math.max(6, (groupWidth * 0.8) / Math.max(1, categories.length))
  const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; items: Transaction[] } | null>(null)
  const containerRef = React.useRef<HTMLDivElement | null>(null)

  function showTooltip(items: Transaction[], clientX: number, clientY: number) {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    // Position relative au conteneur
    const x = clientX - rect.left
    const y = clientY - rect.top
    setTooltip({ visible: true, x, y, items })
  }
  function hideTooltip() { setTooltip(null) }

  return (
    <div ref={containerRef} className="relative">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {Array.from({ length: 4 }, (_, i) => {
            const y = (i / 3) * innerH
            const val = Math.round((1 - i / 3) * max)
            return (
              <g key={i} transform={`translate(0,${y})`}>
                <line x1={0} x2={innerW} stroke="#eee" />
                <text x={-12} y={4} fontSize={10} textAnchor="end" fill="#666">{`${val}$`}</text>
              </g>
            )
          })}

          {labels.map((lbl, li) => {
            const gx = li * groupWidth + groupWidth * 0.1
            return (
              <g key={lbl} transform={`translate(${gx},0)`}> 
                {categories.map((cat, ci) => {
                  const v = values[ci]?.[li] || 0
                  const h = (v / max) * innerH
                  const x = ci * barWidth
                  const y = innerH - h
                  const items = itemsByCategoryLabel?.[ci]?.[li] || []
                  return (
                    <rect key={cat}
                      x={x}
                      y={y}
                      width={barWidth - 2}
                      height={h}
                      fill={colorMap[cat] || '#ccc'}
                      rx={3}
                      onMouseEnter={(e) => showTooltip(items, (e as any).clientX, (e as any).clientY)}
                      onMouseMove={(e) => showTooltip(items, (e as any).clientX, (e as any).clientY)}
                      onMouseLeave={hideTooltip}
                    />
                  )
                })}
                <text x={groupWidth / 2 - 6} y={innerH + 14} fontSize={11} textAnchor="middle" fill="#444">{lbl}</text>
              </g>
            )
          })}
        </g>
      </svg>
      <div className="mt-2 flex flex-wrap gap-3">
        {categories.map(c => (
          <div key={c} className="flex items-center gap-2 text-sm">
            <span style={{ width: 14, height: 14, background: colorMap[c], display: 'inline-block', borderRadius: 3 }} />
            <span className="text-gray-700">{c}</span>
          </div>
        ))}
      </div>
      {tooltip && tooltip.visible && (
        <div 
          className="absolute z-[100] pointer-events-none" 
          style={{ 
            left: `${tooltip.x + 15}px`, 
            top: `${tooltip.y - 10}px`
          }}
        >
          <div className="bg-white border-2 border-gray-300 shadow-xl rounded-lg p-3 text-sm min-w-[200px] max-w-xs">
            <div className="font-semibold mb-2 text-gray-800 border-b pb-1">
              Total: {(tooltip.items.reduce((s, it) => s + it.amount, 0)).toFixed(2)} $
            </div>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {tooltip.items.slice(0, 8).map((it, i) => (
                <div key={i} className="flex justify-between gap-4">
                  <div className="text-gray-700 truncate flex-1">{it.description || '—'}</div>
                  <div className="text-gray-900 font-medium whitespace-nowrap">{it.amount.toFixed(2)} $</div>
                </div>
              ))}
              {tooltip.items.length > 8 && (
                <div className="text-xs text-gray-500 pt-1 border-t">
                  +{tooltip.items.length - 8} autre{tooltip.items.length - 8 > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Composant graphique revenus vs dépenses par mois
function IncomeVsExpenseChart({ transactions }: { transactions: Transaction[] }) {
  const currentYear = new Date().getFullYear()
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']
  
  // Calculer revenus et dépenses par mois
  const monthlyData = useMemo(() => {
    const data = Array.from({ length: 12 }, (_, i) => ({
      month: months[i],
      income: 0,
      expense: 0
    }))
    
    transactions.forEach(tx => {
      const txDate = new Date(tx.date)
      if (txDate.getFullYear() !== currentYear) return
      
      const monthIndex = txDate.getMonth()
      if (tx.type === 'income') {
        data[monthIndex].income += tx.amount
      } else if (tx.type === 'expense') {
        data[monthIndex].expense += tx.amount
      }
    })
    
    return data
  }, [transactions, currentYear])
  
  const width = 960
  const height = 300
  const padding = { top: 20, right: 20, bottom: 70, left: 60 }
  const innerW = width - padding.left - padding.right
  const innerH = height - padding.top - padding.bottom
  
  const maxValue = Math.max(1, ...monthlyData.flatMap(d => [d.income, d.expense]))
  const barWidth = innerW / (months.length * 2.5)
  const groupWidth = innerW / months.length
  
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Grille horizontale et labels Y */}
          {Array.from({ length: 5 }, (_, i) => {
            const y = (i / 4) * innerH
            const val = Math.round((1 - i / 4) * maxValue)
            return (
              <g key={i}>
                <line x1={0} x2={innerW} y1={y} y2={y} stroke="#eee" strokeWidth="1" />
                <text x={-10} y={y + 4} fontSize={11} textAnchor="end" fill="#666">{val.toLocaleString()} $</text>
              </g>
            )
          })}
          
          {/* Barres pour chaque mois */}
          {monthlyData.map((data, i) => {
            const xCenter = i * groupWidth + groupWidth / 2
            const incomeHeight = (data.income / maxValue) * innerH
            const expenseHeight = (data.expense / maxValue) * innerH
            
            return (
              <g key={data.month}>
                {/* Barre revenus (verte) */}
                <rect
                  x={xCenter - barWidth - 2}
                  y={innerH - incomeHeight}
                  width={barWidth}
                  height={incomeHeight}
                  fill="#10b981"
                  rx={2}
                />
                <text
                  x={xCenter - barWidth / 2 - 2}
                  y={innerH - incomeHeight - 5}
                  fontSize={9}
                  textAnchor="middle"
                  fill="#059669"
                  fontWeight="600"
                >
                  {data.income > 0 ? data.income.toFixed(0) : ''}
                </text>
                
                {/* Barre dépenses (rouge) */}
                <rect
                  x={xCenter + 2}
                  y={innerH - expenseHeight}
                  width={barWidth}
                  height={expenseHeight}
                  fill="#ef4444"
                  rx={2}
                />
                <text
                  x={xCenter + barWidth / 2 + 2}
                  y={innerH - expenseHeight - 5}
                  fontSize={9}
                  textAnchor="middle"
                  fill="#dc2626"
                  fontWeight="600"
                >
                  {data.expense > 0 ? data.expense.toFixed(0) : ''}
                </text>
                
                {/* Label du mois */}
                <text
                  x={xCenter}
                  y={innerH + 15}
                  fontSize={11}
                  textAnchor="middle"
                  fill="#374151"
                  fontWeight="500"
                >
                  {data.month}
                </text>
              </g>
            )
          })}
          
          {/* Ligne de base */}
          <line x1={0} x2={innerW} y1={innerH} y2={innerH} stroke="#333" strokeWidth="1.5" />
        </g>
        
        {/* Légende */}
        <g transform={`translate(${width / 2 - 80},${height - 25})`}>
          <rect x={0} y={0} width={15} height={15} fill="#10b981" rx={2} />
          <text x={20} y={12} fontSize={12} fill="#374151">Revenus</text>
          
          <rect x={90} y={0} width={15} height={15} fill="#ef4444" rx={2} />
          <text x={110} y={12} fontSize={12} fill="#374151">Dépenses</text>
        </g>
      </svg>
    </div>
  )
}

export default function ReportsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [periodType, setPeriodType] = useState<PeriodType>('monthly')
  const today = new Date()
  const [selectedYear, setSelectedYear] = useState<number>(today.getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<number>(today.getMonth() + 1)
  function getISOWeek(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
    return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
  }
  function getISOWeekAndYear(d: Date) {
    const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()))
    const dayNum = date.getUTCDay() || 7
    date.setUTCDate(date.getUTCDate() + 4 - dayNum)
    const year = date.getUTCFullYear()
    const yearStart = new Date(Date.UTC(year, 0, 1))
    const week = Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
    return { week, year }
  }

  function weeksInYear(y: number) {
    return getISOWeekAndYear(new Date(y, 11, 28)).week
  }
  const [selectedWeek, setSelectedWeek] = useState<number>(getISOWeek(today))

  // month/week navigation helpers
  function goToPrevMonth() {
    setSelectedMonth(m => {
      if (m === 1) {
        setSelectedYear(y => y - 1)
        return 12
      }
      return m - 1
    })
  }
  function goToNextMonth() {
    setSelectedMonth(m => {
      if (m === 12) {
        setSelectedYear(y => y + 1)
        return 1
      }
      return m + 1
    })
  }
  function goToCurrentMonth() {
    const n = new Date()
    setSelectedYear(n.getFullYear())
    setSelectedMonth(n.getMonth() + 1)
  }

  function goToPrevWeek() {
    setSelectedWeek(w => {
      if (w > 1) return w - 1
      // move to last week of previous year
      setSelectedYear(y => {
        const prev = y - 1
        const last = weeksInYear(prev)
        setSelectedWeek(last)
        return prev
      })
      return 1
    })
  }
  function goToNextWeek() {
    setSelectedWeek(w => {
      const y = selectedYear
      const last = weeksInYear(y)
      if (w < last) return w + 1
      // overflow to week 1 of next year
      setSelectedYear(y + 1)
      return 1
    })
  }
  function goToCurrentWeek() {
    const now = new Date()
    const info = getISOWeekAndYear(now)
    setSelectedYear(info.year)
    setSelectedWeek(info.week)
  }

  useEffect(() => {
    getTransactions(0, 1000).then(setTransactions)
    getAccounts().then(setAccounts)
  }, [])

  const [startDate, endDate] = useMemo(() => {
    if (periodType === 'yearly') return getDateRangeForPeriod('yearly', selectedYear)
    if (periodType === 'monthly') return getDateRangeForPeriod('monthly', selectedYear, selectedMonth)
    return getDateRangeForPeriod('weekly', selectedYear, undefined, selectedWeek)
  }, [periodType, selectedYear, selectedMonth, selectedWeek])

  function formatWeekLabel(start: string, end: string, weekNum: number) {
    try {
      const s = new Date(start)
      const e = new Date(end)
      const sDay = s.toLocaleDateString('fr-CA', { day: '2-digit' })
      const eDay = e.toLocaleDateString('fr-CA', { day: '2-digit', month: 'short' })
      return `S${weekNum} (${sDay}–${eDay})`
    } catch (err) {
      return `S${weekNum}`
    }
  }

  const filtered = useMemo(() => transactions.filter(t => t.date >= startDate && t.date <= endDate), [transactions, startDate, endDate])

  const categoryAggregates = useMemo(() => {
    const byCategory: Record<string, { total: number; items: Transaction[] }> = {}
    filtered.forEach(t => {
      if (t.type !== 'expense') return
      const key = t.category || 'Autre'
      if (!byCategory[key]) byCategory[key] = { total: 0, items: [] }
      byCategory[key].total += t.amount
      byCategory[key].items.push(t)
    })
    return byCategory
  }, [filtered])

  const colorMap = useMemo(() => {
    const keys = Object.keys(categoryAggregates)
    const map: Record<string, string> = {}
    keys.forEach((k, i) => {
      const hue = Math.floor((i * 137.508) % 360)
      map[k] = `hsl(${hue} 70% 75%)`
    })
    return map
  }, [categoryAggregates])

  const labels = useMemo(() => buildLabelsForPeriod(periodType, startDate, endDate, selectedYear, selectedMonth, selectedWeek), [periodType, startDate, endDate, selectedYear, selectedMonth, selectedWeek])
  const categories = useMemo(() => Object.keys(categoryAggregates).sort((a, b) => categoryAggregates[b].total - categoryAggregates[a].total), [categoryAggregates])

  const { values, itemsMatrix } = useMemo(() => {
    const mat = categories.map(() => labels.map(() => 0))
    const itemsMat: Transaction[][][] = categories.map(() => labels.map(() => []))
    categories.forEach((cat, ci) => {
      const items = categoryAggregates[cat]?.items || []
      items.forEach(tx => {
        if (periodType === 'yearly') {
          const month = parseInt(tx.date.split('-')[1], 10) - 1
          mat[ci][month] += tx.amount
          itemsMat[ci][month].push(tx)
        } else if (periodType === 'monthly') {
          const day = parseInt(tx.date.split('-')[2], 10)
          const weekIndex = Math.floor((day - 1) / 7)
          mat[ci][weekIndex] += tx.amount
          itemsMat[ci][weekIndex].push(tx)
        } else {
          const d = new Date(tx.date)
          const s = new Date(startDate)
          const index = Math.floor((d.getTime() - s.getTime()) / (24 * 60 * 60 * 1000))
          if (index >= 0 && index < labels.length) {
            mat[ci][index] += tx.amount
            itemsMat[ci][index].push(tx)
          }
        }
      })
    })
    return { values: mat, itemsMatrix: itemsMat }
  }, [categories, labels, categoryAggregates, periodType, startDate])

  const years = useMemo(() => {
    const min = transactions.length ? Math.min(...transactions.map(t => parseInt(t.date.split('-')[0], 10))) : new Date().getFullYear()
    const max = new Date().getFullYear()
    const res: number[] = []
    for (let i = min; i <= max; i++) res.push(i)
    return res
  }, [transactions])

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Rapports</h1>
        <div />
      </div>

      <div className="card p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Type de période</label>
            <div className="flex gap-3">
              <button onClick={() => {
                const now = new Date()
                const info = getISOWeekAndYear(now)
                setSelectedYear(info.year)
                setSelectedWeek(info.week)
                setPeriodType('weekly')
              }} className={`px-4 py-2 rounded text-sm font-medium ${periodType === 'weekly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Hebdomadaire</button>
              <button onClick={() => setPeriodType('monthly')} className={`px-4 py-2 rounded text-sm font-medium ${periodType === 'monthly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Mensuel</button>
              <button onClick={() => setPeriodType('yearly')} className={`px-4 py-2 rounded text-sm font-medium ${periodType === 'yearly' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}>Annuel</button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Année</label>
            <select value={selectedYear} onChange={e => setSelectedYear(parseInt(e.target.value, 10))} className="w-28 px-2 py-1 border rounded-md ml-4">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>

          {periodType === 'monthly' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Mois</label>
              <div className="flex items-center gap-3">
                <button onClick={goToPrevMonth} className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200" aria-label="Mois précédent">◀</button>
                <button onClick={goToCurrentMonth} className="text-sm font-medium underline text-gray-700">{new Date(selectedYear, selectedMonth - 1).toLocaleDateString('fr-CA', { month: 'long', year: 'numeric' })}</button>
                <button onClick={goToNextMonth} className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200" aria-label="Mois suivant">▶</button>
              </div>
            </div>
          )}

              {periodType === 'weekly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Semaine</label>
                    <div className="flex items-center gap-3">
                      <button onClick={goToPrevWeek} className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200" aria-label="Semaine précédente">◀</button>
                      {(() => {
                        const nowInfo = getISOWeekAndYear(new Date())
                        const isCurrent = selectedWeek === nowInfo.week && selectedYear === nowInfo.year
                          if (isCurrent) {
                            return <div className="text-sm font-medium text-gray-700">Semaine en cours</div>
                          }
                          return <div className="text-sm font-medium text-gray-700">{formatWeekLabel(startDate, endDate, selectedWeek)}</div>
                      })()}
                      <button onClick={goToNextWeek} className="px-3 py-2 border rounded bg-gray-100 hover:bg-gray-200" aria-label="Semaine suivante">▶</button>
                    </div>
                </div>
              )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4">Revenus vs Dépenses ({new Date().getFullYear()})</h3>
          <IncomeVsExpenseChart transactions={transactions} />
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4">
            Dépenses groupées - {periodType === 'weekly' ? 'Hebdomadaire' : periodType === 'monthly' ? 'Mensuel' : 'Annuel'}
          </h3>
          {categories.length ? (
            <GroupedBarChart categories={categories} labels={labels} values={values} itemsByCategoryLabel={itemsMatrix} colorMap={colorMap} />
          ) : (
            <div className="text-sm text-gray-600">Aucune dépense pour la période sélectionnée.</div>
          )}
        </div>

        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-4">Dépenses par catégorie</h3>
          <div className="flex items-center justify-center">
            <CategoryPieChart transactions={Object.values(categoryAggregates).flatMap(c => c.items)} size={320} colorMap={colorMap} showPercentInPie />
          </div>
        </div>
      </div>

      <div className="mt-8">
        <h3 className="text-lg font-semibold mb-4">Détail par catégorie</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left font-semibold">Catégorie</th>
                <th className="px-4 py-2 text-right font-semibold">Montant</th>
                <th className="px-4 py-2 text-right font-semibold">% du total</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(categoryAggregates).sort((a, b) => b[1].total - a[1].total).map(([cat, info]) => {
                const total = Object.values(categoryAggregates).reduce((s, v) => s + v.total, 0) || 1
                const pct = (info.total / total) * 100
                return (
                  <tr key={cat} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{cat}</td>
                    <td className="px-4 py-3 text-right font-semibold">{info.total.toFixed(2)}$</td>
                    <td className="px-4 py-3 text-right">{pct.toFixed(1)}%</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
