import React, { useState } from 'react'
import type { Transaction } from '../db'
import { addTransaction, deleteTransactionsBatch } from '../db'
import TransactionList from './TransactionList'

export default function GroupedTransactionList({ 
  transactions, 
  onEdit, 
  onDelete,
  onRefresh
}: {
  transactions: Transaction[]
  onEdit?: (t: Transaction) => void | Promise<void>
  onDelete?: (t: Transaction) => void | Promise<void>
  onRefresh?: () => void
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [newStartDate, setNewStartDate] = useState('')
  const [newEndDate, setNewEndDate] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [showAllStandalone, setShowAllStandalone] = useState(false)
  const [showAllRecurring, setShowAllRecurring] = useState(false)

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

  // Filtrer les transactions ponctuelles selon la recherche
  const filteredStandalone = standalone.filter(t => {
    if (!searchQuery.trim()) return true
    const query = searchQuery.toLowerCase()
    return (
      t.description.toLowerCase().includes(query) ||
      t.category.toLowerCase().includes(query) ||
      t.date.includes(query) ||
      (t.subcategory && t.subcategory.toLowerCase().includes(query))
    )
  })

  // Filtrer les groupes récurrents selon la recherche
  const filteredGrouped: { [key: string]: Transaction[] } = {}
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase()
    Object.entries(grouped).forEach(([key, txs]) => {
      const first = txs[0]
      if (
        first.description.toLowerCase().includes(query) ||
        first.category.toLowerCase().includes(query) ||
        (first.subcategory && first.subcategory.toLowerCase().includes(query)) ||
        txs.some(t => t.date.includes(query))
      ) {
        filteredGrouped[key] = txs
      }
    })
  } else {
    Object.assign(filteredGrouped, grouped)
  }

  // Par défaut, afficher toutes les transactions filtrées (ou les 50 premières si trop nombreuses)
  const displayedStandalone = filteredStandalone.slice(0, showAllStandalone ? filteredStandalone.length : 50)

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

    // Limiter à 24 occurrences si pas de date de fin (2 ans pour mensuel, 6 mois pour hebdo, etc.)
    const maxOccurrences = endDate ? 1000 : 24

    while ((!endDate && newDates.length < maxOccurrences) || (endDate && currentDate <= endDate)) {
      newDates.push(currentDate.toISOString().slice(0, 10))
      currentDate = new Date(currentDate.getTime() + interval * 24 * 60 * 60 * 1000)
    }

    // Mettre à jour les transactions existantes qui correspondent aux nouvelles dates
    for (let i = 0; i < sortedTxs.length && i < newDates.length; i++) {
      if (onEdit) {
        onEdit({ ...sortedTxs[i], date: newDates[i] })
      }
    }

    // Supprimer les transactions qui dépassent la nouvelle date de fin ou la limite
    if (newDates.length < sortedTxs.length) {
      const toDelete = sortedTxs.slice(newDates.length)
      const idsToDelete = toDelete.map(tx => tx.id).filter((id): id is number => id !== undefined)
      
      if (idsToDelete.length > 0) {
        await deleteTransactionsBatch(idsToDelete)
      }
    }

    // Ajouter de nouvelles occurrences si nécessaire
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
          date: newDates[i],
          accountId: template.accountId
        })
      }
    }

    // Attendre un peu pour que toutes les opérations DB se terminent
    await new Promise(resolve => setTimeout(resolve, 100))
    
    cancelEditDates()
    
    if (onRefresh) {
      onRefresh()
    }
  }

  const deleteGroup = async (txs: Transaction[]) => {
    if (!window.confirm(`Supprimer toutes les ${txs.length} occurrences de cette récurrence ?`)) return
    
    const idsToDelete = txs.map(tx => tx.id).filter((id): id is number => id !== undefined)
    
    if (idsToDelete.length > 0) {
      await deleteTransactionsBatch(idsToDelete)
    }
    
    if (onRefresh) {
      onRefresh()
    }
  }

  if (!transactions.length) return <div className="text-gray-500">Aucune transaction</div>

  return (
    <div className="space-y-4">
      {/* Barre de recherche globale */}
      {(Object.keys(grouped).length > 0 || standalone.length > 0) && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 rounded-lg">
          <input
            type="text"
            placeholder="🔍 Rechercher dans toutes les transactions (description, catégorie, date, sous-catégorie)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {searchQuery && (
            <div className="mt-2 text-xs text-gray-600">
              Résultats: {Object.keys(filteredGrouped).length} groupe(s) récurrent(s) • {filteredStandalone.length} transaction(s) ponctuelle(s)
            </div>
          )}
        </div>
      )}

      {Object.keys(filteredGrouped).length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">
                Transactions récurrentes ({Object.keys(filteredGrouped).length} groupe{Object.keys(filteredGrouped).length > 1 ? 's' : ''})
              </h3>
              <button
                onClick={() => setShowAllRecurring(!showAllRecurring)}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                {showAllRecurring ? 'Masquer les détails' : 'Afficher les détails'}
              </button>
            </div>
          </div>
          {showAllRecurring && (
            <div className="bg-white p-2 space-y-2">
              {Object.entries(filteredGrouped).map(([key, txs]) => {
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
            </div>
          )}
        </div>
      )}

      {standalone.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-gray-50 p-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700">
                Transactions ponctuelles 
                {!showAllStandalone && filteredStandalone.length > 50 && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    (50 premières sur {filteredStandalone.length})
                  </span>
                )}
                {showAllStandalone && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({filteredStandalone.length} transactions)
                  </span>
                )}
              </h3>
              <div className="flex gap-2">
                {filteredStandalone.length > 50 && !showAllStandalone && (
                  <button
                    onClick={() => setShowAllStandalone(true)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Afficher tout
                  </button>
                )}
                {showAllStandalone && filteredStandalone.length > 50 && (
                  <button
                    onClick={() => setShowAllStandalone(false)}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Réduire
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="bg-white p-2">
            {displayedStandalone.length > 0 ? (
              <TransactionList 
                transactions={displayedStandalone.sort((a, b) => b.date.localeCompare(a.date))} 
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                {searchQuery ? 'Aucune transaction trouvée' : 'Aucune transaction ponctuelle'}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
