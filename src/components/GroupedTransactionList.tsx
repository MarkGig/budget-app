import React, { useState } from 'react'
import type { Transaction } from '../db'
import { addTransaction } from '../db'
import TransactionList from './TransactionList'

export default function GroupedTransactionList({ 
  transactions, 
  onEdit, 
  onDelete,
  onRefresh
}: {
  transactions: Transaction[]
  onEdit?: (t: Transaction) => void
  onDelete?: (t: Transaction) => void
  onRefresh?: () => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')

  // Regrouper les transactions par récurrence
  const grouped: { [key: string]: Transaction[] } = {}
  const standalone: Transaction[] = []
  
  transactions.forEach(t => {
    if (t.periodicity && t.periodicity !== 'Aucune') {
      const key = `${t.description}-${t.category}-${t.amount}-${t.periodicity}`
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(t)
    } else {
      standalone.push(t)
    }
  })

  const toggleGroup = (key: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(key)) {
      newExpanded.delete(key)
    } else {
      newExpanded.add(key)
    }
    setExpandedGroups(newExpanded)
  }

  const startEditDates = (key: string, txs: Transaction[]) => {
    const sortedDates = txs.map(t => t.date).sort()
    setEditingGroup(key)
    setNewStartDate(sortedDates[0] || '')
    setNewEndDate(sortedDates[sortedDates.length - 1] || '')
  }

  const cancelEditDates = () => {
    setEditingGroup(null)
    setNewStartDate('')
    setNewEndDate('')
  }

  const saveEditDates = async (key: string, txs: Transaction[]) => {
    if (!newStartDate) return

    const sortedTxs = [...txs].sort((a, b) => a.date.localeCompare(b.date))
    
    const oldDates = sortedTxs.map(t => new Date(t.date))
    let interval = 0
    if (oldDates.length > 1) {
      interval = Math.round((oldDates[1].getTime() - oldDates[0].getTime()) / (1000 * 60 * 60 * 24))
    } else {
      const first = sortedTxs[0]
      if (first.periodicity === 'Hebdomadaire') interval = 7
      else if (first.periodicity === 'Aux 2 semaines') interval = 14
      else if (first.periodicity === 'Bi-mensuel') interval = 15
      else if (first.periodicity === 'Mensuel') interval = 30
      else if (first.periodicity === 'Annuel') interval = 365
    }

    const startDate = new Date(newStartDate)
    const endDate = newEndDate ? new Date(newEndDate) : null
    const newDates: string[] = []
    let currentDate = new Date(startDate)

    while (!endDate || currentDate <= endDate) {
      newDates.push(currentDate.toISOString().slice(0, 10))
      if (newDates.length >= 100) break
      currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000)
    }

    for (let i = 0; i < sortedTxs.length && i < newDates.length; i++) {
      if (onEdit) {
        onEdit({ ...sortedTxs[i], date: newDates[i] })
      }
    }

    if (newDates.length < sortedTxs.length) {
      for (let i = newDates.length; i < sortedTxs.length; i++) {
        if (onDelete) {
          onDelete(sortedTxs[i])
        }
      }
    }

    if (newDates.length > sortedTxs.length) {
      const template = sortedTxs[0]
      for (let i = sortedTxs.length; i < newDates.length; i++) {
        await addTransaction({ 
          description: template.description,
          amount: template.amount,
          type: template.type,
          category: template.category,
          subcategory: template.subcategory,
          periodicity: template.periodicity,
          date: newDates[i]
        })
      }
    }

    cancelEditDates()
    
    if (onRefresh) {
      setTimeout(() => onRefresh(), 100)
    }
  }

  const deleteGroup = async (txs: Transaction[]) => {
    if (!window.confirm(`Supprimer toutes les ${txs.length} occurrences de cette récurrence ?`)) return
    
    for (const tx of txs) {
      if (onDelete) {
        onDelete(tx)
      }
    }
    
    if (onRefresh) {
      setTimeout(() => onRefresh(), 100)
    }
  }

  if (!transactions.length) return <div className="text-gray-500">Aucune transaction</div>

  return (
    <div className="space-y-4">
      {Object.entries(grouped).map(([key, txs]) => {
        const first = txs[0]
        const isExpanded = expandedGroups.has(key)
        const isEditing = editingGroup === key
        const total = txs.reduce((sum, t) => sum + t.amount, 0)
        const sortedDates = txs.map(t => t.date).sort()
        
        return (
          <div key={key} className="border rounded-lg overflow-hidden">
            <div 
              className="bg-gray-50 p-3 cursor-pointer hover:bg-gray-100 flex items-center justify-between"
              onClick={() => !isEditing && toggleGroup(key)}
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{isExpanded ? '▼' : '▶'}</span>
                <div>
                  <div className="font-semibold text-gray-800">{first.description}</div>
                  <div className="text-xs text-gray-500">
                    {first.category} • {first.periodicity} • {txs.length} occurrence{txs.length > 1 ? 's' : ''}
                  </div>
                  {!isEditing && (
                    <div className="text-xs text-gray-400 mt-1">
                      {sortedDates[0]} → {sortedDates[sortedDates.length - 1]}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right min-w-[100px]">
                  <div className={`font-bold ${first.type === 'expense' ? 'text-red-600' : first.type === 'income' ? 'text-green-600' : 'text-blue-600'}`}>
                    {total.toFixed(2)}$
                  </div>
                  <div className="text-xs text-gray-500 whitespace-nowrap">{first.amount.toFixed(2)}$ × {txs.length}</div>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    startEditDates(key, txs)
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 whitespace-nowrap flex-shrink-0"
                >
                  ⚙️ Gérer
                </button>
              </div>
            </div>
            
            {isEditing && (
              <div className="bg-blue-50 p-4 border-t" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-sm font-semibold mb-3 text-gray-700">Modifier les dates de récurrence</h3>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date de début</label>
                    <input
                      type="date"
                      value={newStartDate}
                      onChange={(e) => setNewStartDate(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="1900-01-01"
                      max="2099-12-31"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Date de fin (optionnel)</label>
                    <input
                      type="date"
                      value={newEndDate}
                      onChange={(e) => setNewEndDate(e.target.value)}
                      className="w-full px-2 py-1 border rounded text-sm"
                      min="1900-01-01"
                      max="2099-12-31"
                    />
                  </div>
                </div>
                <div className="text-xs text-gray-600 mb-3">
                  La périodicité ({first.periodicity}) sera conservée. Les nouvelles occurrences seront générées automatiquement.
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEditDates(key, txs)}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                  >
                    ✓ Sauvegarder
                  </button>
                  <button
                    onClick={cancelEditDates}
                    className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                  >
                    ✗ Annuler
                  </button>
                  <button
                    onClick={() => {
                      cancelEditDates()
                      deleteGroup(txs)
                    }}
                    className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 ml-auto"
                  >
                    🗑️ Supprimer le groupe
                  </button>
                </div>
              </div>
            )}

            {isExpanded && !isEditing && (
              <div className="bg-white p-2">
                <TransactionList 
                  transactions={txs.sort((a, b) => b.date.localeCompare(a.date))} 
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            )}
          </div>
        )
      })}

      {standalone.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3 font-semibold text-gray-700">
            Transactions ponctuelles ({standalone.length})
          </div>
          <div className="bg-white p-2">
            <TransactionList 
              transactions={standalone.sort((a, b) => b.date.localeCompare(a.date))} 
              onEdit={onEdit}
              onDelete={onDelete}
            />
          </div>
        </div>
      )}
    </div>
  )
}
