import React, { useState } from 'react'
import type { Transaction } from '../db'

import { DEFAULT_EXPENSE_CATEGORIES } from '../defaultCategories'
const DEFAULT_INCOME_CATEGORIES = ['Salaire', 'Dividende', 'Autre']
const DEFAULT_SAVINGS_CATEGORIES = ['Urgence', 'Retraite', 'Projet', 'Autre']

export default function TransactionList({ transactions, onEdit, onDelete }: {
  transactions: Transaction[]
  onEdit?: (t: Transaction) => void
  onDelete?: (t: Transaction) => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<Transaction>>({})

  if (!transactions.length) return <div className="text-gray-500">Aucune transaction</div>

  const startEdit = (t: Transaction) => {
    setEditingId(t.id ?? null)
    setEditData({ ...t })
  }
  const cancelEdit = () => {
    setEditingId(null)
    setEditData({})
  }
  const saveEdit = () => {
    if (onEdit && editingId != null) {
      onEdit({ ...(editData as Transaction), id: editingId })
      setEditingId(null)
      setEditData({})
    }
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-sm border rounded shadow bg-white">
        <thead>
          <tr className="bg-gray-100 text-gray-700 uppercase text-xs">
            <th className="px-2 py-2 whitespace-nowrap">Date</th>
            <th className="px-2 py-2 whitespace-nowrap">Description</th>
            <th className="px-2 py-2 whitespace-nowrap">Montant</th>
            <th className="px-2 py-2 whitespace-nowrap">Actions</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            <tr key={t.id} className="hover:bg-blue-50 border-b last:border-0">
              {editingId === t.id ? (
                <>
                  <td className="px-2 py-2 text-gray-600 whitespace-nowrap">
                    <input type="date" className="border rounded p-1" value={editData.date || ''} onChange={e => setEditData(d => ({ ...d, date: e.target.value }))} min="1900-01-01" max="2099-12-31" />
                  </td>
                  <td className="px-2 py-2">
                    <input className="border rounded p-1 w-full" value={editData.description || ''} onChange={e => setEditData(d => ({ ...d, description: e.target.value }))} />
                  </td>
                  <td className="px-2 py-2">
                    <input className="border rounded p-1 w-20" type="number" value={editData.amount || ''} onChange={e => setEditData(d => ({ ...d, amount: Number(e.target.value) }))} />
                  </td>
                  <td className="px-2 py-2 flex gap-2 whitespace-nowrap">
                    <button className="text-green-600 hover:underline" onClick={saveEdit}>Valider</button>
                    <button className="text-gray-600 hover:underline" onClick={cancelEdit}>Annuler</button>
                  </td>
                </>
              ) : (
                <>
                  <td className="px-2 py-2 text-gray-600 whitespace-nowrap">{t.date}</td>
                  <td className="px-2 py-2">{t.description}</td>
                  <td className={`px-2 py-2 font-semibold whitespace-nowrap ${t.type === 'expense' ? 'text-red-600' : t.type === 'income' ? 'text-green-600' : 'text-blue-600'}`}>{t.amount.toFixed(2)}$</td>
                  <td className="px-2 py-2 flex gap-2 whitespace-nowrap">
                    {onEdit && <button className="text-blue-600 hover:underline" onClick={() => startEdit(t)}>Éditer</button>}
                    {onDelete && <button className="text-red-600 hover:underline" onClick={() => onDelete(t)}>Supprimer</button>}
                  </td>
                </>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
