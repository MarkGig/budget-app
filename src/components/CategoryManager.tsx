import React, { useState } from 'react'
import { deleteCategory } from '../db'
import { openDB } from 'idb'

interface CategoryManagerProps {
  type: 'income' | 'expense'
  onCategoryDeleted: () => void
}

export default function CategoryManager({ type, onCategoryDeleted }: CategoryManagerProps) {
  const [customCategories, setCustomCategories] = useState<Array<{ id: number; name: string }>>([])
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  async function loadCustomCategories() {
    setLoading(true)
    try {
      const db = await openDB('budget-db')
      const allCats = await db.getAll('categories')
      const filtered = allCats.filter((c: any) => c.type === type)
      setCustomCategories(filtered)
      setIsOpen(true)
    } catch (error) {
      console.error('Erreur lors du chargement des catégories:', error)
    }
    setLoading(false)
  }

  async function handleDeleteCategory(id: number) {
    if (!confirm('Supprimer cette catégorie ?')) return

    await deleteCategory(id)
    setCustomCategories(customCategories.filter((c) => c.id !== id))
    onCategoryDeleted()
  }

  return (
    <div className="mt-4 p-3 bg-gray-50 rounded-md">
      <button
        type="button"
        onClick={loadCustomCategories}
        className="w-full px-3 py-2 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-100"
      >
        {loading ? 'Chargement...' : 'Gérer les catégories'}
      </button>

      {isOpen && customCategories.length > 0 ? (
        <div className="mt-3 space-y-1">
          <p className="text-xs text-gray-600 font-semibold">Catégories personnalisées :</p>
          {customCategories.map((cat) => (
            <div
              key={cat.id}
              className="flex justify-between items-center p-2 bg-white border border-gray-200 rounded text-sm"
            >
              <span>{cat.name}</span>
              <button
                type="button"
                onClick={() => handleDeleteCategory(cat.id)}
                className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50"
              >
                Supprimer
              </button>
            </div>
          ))}
        </div>
      ) : isOpen ? (
        <p className="mt-2 text-xs text-gray-500">Aucune catégorie personnalisée</p>
      ) : null}
    </div>
  )
}
