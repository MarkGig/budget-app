import React, { useState } from 'react'
import type { Transaction } from '../db'

export default function ExpenseSummary({ transactions }: { transactions: Transaction[] }) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

  // Calculate expenses by category (from all transactions passed in)
  const expensesByCategory: Record<string, number> = {}
  const transactionsByCategory: Record<string, Transaction[]> = {}
  
  transactions
    .filter((t) => t.type === 'expense')
    .forEach((t) => {
      expensesByCategory[t.category] = (expensesByCategory[t.category] || 0) + t.amount
      if (!transactionsByCategory[t.category]) {
        transactionsByCategory[t.category] = []
      }
      transactionsByCategory[t.category].push(t)
    })

  const categories = Object.entries(expensesByCategory).sort((a, b) => b[1] - a[1])

  if (!categories.length) return <div className="text-gray-500">Aucune dépense enregistrée</div>

  return (
    <div className="space-y-2">
      {categories.map(([cat, total]) => {
        const isExpanded = expandedCategory === cat
        const categoryTransactions = transactionsByCategory[cat] || []

        return (
          <div key={cat}>
            <button
              onClick={() => setExpandedCategory(isExpanded ? null : cat)}
              className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-gray-100 rounded-md transition cursor-pointer"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-700">{cat}</span>
                <span className="text-xs text-gray-500">({categoryTransactions.length})</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-red-600">{total.toFixed(2)}$</span>
                <span className="text-gray-400">{isExpanded ? '▼' : '▶'}</span>
              </div>
            </button>

            {isExpanded && categoryTransactions.length > 0 && (
              <div className="ml-4 mt-2 space-y-1 bg-white border-l-2 border-gray-200 pl-3">
                {categoryTransactions.map((tx) => (
                  <div key={tx.id} className="py-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-700">{tx.description}</span>
                      <span className="font-semibold text-red-600">{tx.amount.toFixed(2)}$</span>
                    </div>
                    <div className="text-xs text-gray-400">{tx.date}</div>
                  </div>
                ))}
              </div>
            )}

            {isExpanded && categoryTransactions.length === 0 && (
              <div className="ml-4 mt-2 p-2 text-sm text-gray-400 bg-gray-50 rounded">
                Aucune dépense dans cette catégorie
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

