import React, { useEffect, useState } from 'react'
import { addCategory, getCategories, deleteCategory, getCustomCategoryObjects, addSubcategory, getSubcategories, deleteSubcategory, deleteSubcategoriesByCategory, deleteTransactionsByCategory, updateCategory, updateSubcategoriesCategoryName, updateTransactionsCategoryName, Goal, getGoals, addGoal, updateGoal, deleteGoal, exportAllData, importAllData } from '../db'

import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SAVINGS_CATEGORIES } from '../defaultCategories'

// Sous-catégories par défaut (hardcodées)
const DEFAULT_SUBCATEGORIES: Record<string, string[]> = {
  'Habitation': ['Assurance', 'Électricité', 'Entretien', 'Hypothèque', 'Loyer', 'Rénovation', 'Taxes municipales et scolaire'],
  'Alimentation': ['Épiceries', 'Restaurant / Bar'],
  'Voiture': ['Assurance', 'Autres', 'Entretien', 'Essence', 'Paiement'],
  'Sports': ['Abonnement', 'Équipements'],
  'Divertissements': ['Autre', 'Cinema et spectacle', 'Jeux et plateforme', 'Streaming audio et vidéo', 'Television et cable'],
  'Éducation': ['Cours en ligne', 'Frais de scolarité', 'Livre / matériel'],
  'Technologie et communications': ['Cellulaire', 'Internet', 'Logiciel / abonnement'],
  'Autre': ['Animaux', 'Cadeaux', 'Vêtements', 'Voyages']
}

export default function CategoryManagementPage({ onClose }: { onClose: () => void }) {
  const [type, setType] = useState<'expense' | 'income' | 'savings'>('expense')
  const [customCats, setCustomCats] = useState<Array<{ id: number; name: string }>>([])
  const [newCat, setNewCat] = useState('')
  const [selectedCat, setSelectedCat] = useState<string>('')
  const [subcats, setSubcats] = useState<Array<{ id: number; name: string }>>([])
  const [newSub, setNewSub] = useState('')
  const [editingId, setEditingId] = useState<number | string | null | undefined>(null)
  const [editingName, setEditingName] = useState('')
  const [editingType, setEditingType] = useState<'cat' | 'subcat' | null>(null)
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)

  // Goals state
  const DEFAULT_GOAL_TYPES = ['Fonds d\'urgence', 'Voyage', 'Achat important', 'Mise de fond maison', 'Retraite', 'Éducation', 'Autre']
  const [goals, setGoals] = useState<Goal[]>([])
  const [goalTypes, setGoalTypes] = useState<string[]>(DEFAULT_GOAL_TYPES)
  const [newGoal, setNewGoal] = useState<Omit<Goal, 'id'>>({
    name: '',
    type: 'Fonds d\'urgence',
    targetAmount: 0,
    currentAmount: 0,
    targetDate: '',
    notes: ''
  })
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null)
  const [showCustomTypeInput, setShowCustomTypeInput] = useState(false)
  const [customType, setCustomType] = useState('')

  const defaults = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_SAVINGS_CATEGORIES

  useEffect(() => {
    load()
    loadGoals()
  }, [type])

  useEffect(() => {
    if (selectedCat) loadSubcats(selectedCat)
  }, [selectedCat])

  async function load() {
    // default categories depending on type
    const defaults = type === 'expense' ? DEFAULT_EXPENSE_CATEGORIES : type === 'income' ? DEFAULT_INCOME_CATEGORIES : DEFAULT_SAVINGS_CATEGORIES
    let objs: Array<{ id: number; name: string }> = [];
    // load custom categories for any type (including savings)
    objs = await getCustomCategoryObjects(type)
    setCustomCats(objs)
    setSelectedCat(objs[0]?.name || defaults[0] || '')
    // Réinitialiser la catégorie étendue si elle n'existe plus
    if (expandedCategory && ![...defaults, ...objs.map(c => c.name)].includes(expandedCategory)) {
      setExpandedCategory(null)
    }
  }

  async function loadSubcats(catName: string) {
    const customSubs = await getSubcategories(catName)
    const defaultSubs = DEFAULT_SUBCATEGORIES[catName] || []
    
    // Combiner les sous-catégories par défaut avec les personnalisées
    // Les sous-catégories par défaut n'ont pas d'ID (pour éviter de les supprimer)
    const defaultSubsWithFakeId = defaultSubs.map((name, index) => ({ 
      id: -(index + 1), // ID négatif pour identifier les sous-catégories par défaut
      name 
    }))
    
    setSubcats([...defaultSubsWithFakeId, ...customSubs])
  }

  async function handleAddCategory(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newCat.trim()) return
    // persist custom category for any type (expense, income, savings)
    await addCategory({ name: newCat.trim(), type })
    setNewCat('')
    await load()
  }

  async function handleDeleteCategory(id?: number, name?: string) {
    if (!name) return
    if (!confirm(`Supprimer la catégorie "${name}" ET toutes les dépenses associées ? Cette action est irréversible.`)) return
    try {
      // delete transactions & subcategories associated with this category
      await deleteTransactionsByCategory(name)
      await deleteSubcategoriesByCategory(name)
      // if it's a custom category entry in the categories store, delete it
      if (id !== undefined && id !== null) {
        await deleteCategory(id)
      }
      alert('Catégorie et dépenses associées supprimées.')
    } catch (e) {
      alert('Erreur lors de la suppression : ' + (e instanceof Error ? e.message : e))
    }
    await load()
  }

  async function handleAddSubcat(e?: React.FormEvent) {
    e?.preventDefault()
    if (!newSub.trim() || !selectedCat) return
    await addSubcategory({ name: newSub.trim(), categoryName: selectedCat })
    setNewSub('')
    await loadSubcats(selectedCat)
  }

  async function handleDeleteSubcat(id: number) {
    if (!confirm('Supprimer cette sous-catégorie ?')) return
    await deleteSubcategory(id)
    await loadSubcats(selectedCat)
  }

  async function handleEditCategory(id: number | undefined, oldName: string) {
    setEditingId(id)
    setEditingName(oldName)
    setEditingType('cat')
  }

  async function handleSaveEditCategory() {
    if (!editingName.trim() || editingName === undefined) return
    const oldName = customCats.find((c) => c.id === editingId)?.name
    if (!oldName || oldName === editingName.trim()) {
      setEditingId(null)
      setEditingType(null)
      return
    }
    // update category name, and all related transactions and subcategories
    // Ne pas appeler updateCategory pour une catégorie par défaut (editingId string)
    if (typeof editingId === 'number') {
      await updateCategory(editingId, editingName.trim())
    }
    await updateTransactionsCategoryName(oldName, editingName.trim())
    await updateSubcategoriesCategoryName(oldName, editingName.trim())
    setEditingId(null)
    setEditingType(null)
    if (selectedCat === oldName) setSelectedCat(editingName.trim())
    await load()
  }

  async function handleEditSubcategory(id: number, oldName: string) {
    setEditingId(id)
    setEditingName(oldName)
    setEditingType('subcat')
  }

  async function handleSaveEditSubcategory() {
    if (!editingName.trim()) return
    const oldSub = subcats.find((s) => s.id === editingId)
    if (!oldSub || oldSub.name === editingName.trim()) {
      setEditingId(null)
      setEditingType(null)
      return
    }
    // delete old and add new (simpler than updating due to no direct put for subcategories)
    // Ne pas appeler deleteSubcategory pour une catégorie par défaut (jamais le cas ici, mais sécurité)
    if (typeof editingId === 'number') {
      await deleteSubcategory(editingId)
    }
    await addSubcategory({ name: editingName.trim(), categoryName: selectedCat })
    setEditingId(null)
    setEditingType(null)
    await loadSubcats(selectedCat)
  }

  // Goals functions
  async function loadGoals() {
    const allGoals = await getGoals()
    setGoals(allGoals)
    // Extraire tous les types uniques des objectifs existants
    const existingTypes = [...new Set(allGoals.map(g => g.type))]
    const allTypes = [...new Set([...DEFAULT_GOAL_TYPES, ...existingTypes])]
    setGoalTypes(allTypes)
  }

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!newGoal.name.trim() || newGoal.targetAmount <= 0) return
    await addGoal(newGoal)
    setNewGoal({
      name: '',
      type: 'Fonds d\'urgence',
      targetAmount: 0,
      currentAmount: 0,
      targetDate: '',
      notes: ''
    })
    await loadGoals()
  }

  async function handleUpdateGoal(e: React.FormEvent) {
    e.preventDefault()
    if (!editingGoal || !editingGoal.name.trim() || editingGoal.targetAmount <= 0) return
    await updateGoal(editingGoal)
    setEditingGoal(null)
    await loadGoals()
  }

  async function handleDeleteGoal(id: number) {
    if (!confirm('Supprimer cet objectif ?')) return
    await deleteGoal(id)
    await loadGoals()
  }

  function calculateProgress(goal: Goal): number {
    if (goal.targetAmount === 0) return 0
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
  }

  function handleAddCustomType() {
    if (!customType.trim()) return
    const newType = customType.trim()
    if (!goalTypes.includes(newType)) {
      setGoalTypes([...goalTypes, newType])
    }
    if (editingGoal) {
      setEditingGoal({...editingGoal, type: newType})
    } else {
      setNewGoal({...newGoal, type: newType})
    }
    setCustomType('')
    setShowCustomTypeInput(false)
  }

  async function toggleCategory(catName: string) {
    if (expandedCategory === catName) {
      setExpandedCategory(null)
    } else {
      setExpandedCategory(catName)
      // Charger les sous-catégories pour cette catégorie
      await loadSubcats(catName)
    }
  }

  async function handleExport() {
    try {
      const data = await exportAllData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `budget-backup-${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      alert('✅ Données exportées avec succès!')
    } catch (error) {
      alert('❌ Erreur lors de l\'export: ' + error)
    }
  }

  async function handleImport(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return
    
    setIsImporting(true)
    try {
      const text = await file.text()
      const data = JSON.parse(text)
      
      if (!confirm('⚠️ ATTENTION: Ceci va remplacer TOUTES vos données actuelles par celles du fichier. Continuer?')) {
        setIsImporting(false)
        return
      }
      
      await importAllData(data)
      alert('✅ Données importées avec succès! Rechargement de la page...')
      window.location.reload()
    } catch (error) {
      alert('❌ Erreur lors de l\'import: ' + error)
      setIsImporting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Gestion des catégories</h2>
        <button className="px-3 py-1 text-sm border rounded" onClick={onClose}>Retour</button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card p-4">
          <div className="flex items-center gap-3 mb-4">
            <button className={`px-3 py-1 rounded ${type==='expense'?'bg-gray-200':''}`} onClick={() => setType('expense')}>Dépenses</button>
            <button className={`px-3 py-1 rounded ${type==='income'?'bg-gray-200':''}`} onClick={() => setType('income')}>Revenus</button>
            <button className={`px-3 py-1 rounded ${type==='savings'?'bg-gray-200':''}`} onClick={() => setType('savings')}>Épargnes</button>
          </div>

          <form onSubmit={handleAddCategory} className="flex gap-2 mb-3">
            <input className="flex-1 p-2 border rounded" placeholder="Nouvelle catégorie" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
            <button className="px-3 py-1 bg-blue-600 text-white rounded" type="submit">Ajouter</button>
          </form>

          <div>
            <p className="text-sm text-gray-600 mb-2">Catégories par défaut + personnalisées :</p>
            <ul className="space-y-2">
              {defaults.map((d) => (
                <li key={d}>
                  <div 
                    className="flex items-center justify-between cursor-pointer hover:bg-gray-50 p-2 rounded"
                    onClick={() => toggleCategory(d)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">{expandedCategory === d ? '▼' : '▶'}</span>
                      <span>{d}</span>
                    </div>
                  </div>
                  {expandedCategory === d && (
                    <div className="ml-6 mt-2 pl-4 border-l-2 border-gray-200">
                      {subcats.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucune sous-catégorie</p>
                      ) : (
                        <ul className="space-y-1">
                          {subcats.map((s) => (
                            <li key={s.id} className="text-sm text-gray-600">
                              • {s.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
              {customCats.map((c) => (
                <li key={c.id}>
                  <div className="flex items-center justify-between">
                    <div 
                      className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded flex-1"
                      onClick={() => toggleCategory(c.name)}
                    >
                      <span className="text-gray-600">{expandedCategory === c.name ? '▼' : '▶'}</span>
                      {editingId === c.id && editingType === 'cat' ? (
                        <input
                          autoFocus
                          className="flex-1 p-1 border rounded text-sm"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveEditCategory()
                            if (e.key === 'Escape') { setEditingId(null); setEditingType(null) }
                          }}
                        />
                      ) : (
                        <span>{c.name}</span>
                      )}
                    </div>
                    <div className="flex gap-1">
                      {editingId === c.id && editingType === 'cat' ? (
                        <>
                          <button type="button" className="text-green-600 text-sm" onClick={handleSaveEditCategory}>✓</button>
                          <button type="button" className="text-gray-600 text-sm" onClick={() => { setEditingId(null); setEditingType(null) }}>✕</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="text-blue-600 text-sm" onClick={() => handleEditCategory(c.id, c.name)}>Éditer</button>
                          <button
                            type="button"
                            className="text-red-600 text-sm"
                            onClick={() => {
                              if (window.confirm(`Supprimer la catégorie \"${c.name}\" ET toutes les dépenses associées ? Cette action est irréversible.`)) {
                                handleDeleteCategory(c.id, c.name)
                              }
                            }}
                          >Supprimer</button>
                        </>
                      )}
                    </div>
                  </div>
                  {expandedCategory === c.name && (
                    <div className="ml-6 mt-2 pl-4 border-l-2 border-gray-200">
                      {subcats.length === 0 ? (
                        <p className="text-sm text-gray-400 italic">Aucune sous-catégorie</p>
                      ) : (
                        <ul className="space-y-1">
                          {subcats.map((s) => (
                            <li key={s.id} className="text-sm text-gray-600">
                              • {s.name}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card p-4">
          <p className="text-sm text-gray-600 mb-2">Gérer les sous-catégories pour :</p>
          <select className="w-full p-2 border rounded mb-3" value={selectedCat} onChange={async (e) => { setSelectedCat(e.target.value); await loadSubcats(e.target.value) }}>
            {[...defaults, ...customCats.map(c => c.name)].map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <form onSubmit={handleAddSubcat} className="flex gap-2 mb-3">
            <input className="flex-1 p-2 border rounded" placeholder="Nouvelle sous-catégorie" value={newSub} onChange={(e) => setNewSub(e.target.value)} />
            <button className="px-3 py-1 bg-blue-600 text-white rounded" type="submit">Ajouter</button>
          </form>

          <div>
            <p className="text-sm text-gray-600 mb-2">Sous-catégories :</p>
            {subcats.length === 0 ? (
              <p className="text-sm text-gray-400 italic">Aucune sous-catégorie</p>
            ) : (
              <ul className="space-y-2">
                {subcats.map((s) => (
                  <li key={s.id} className="flex items-center justify-between">
                    {editingId === s.id && editingType === 'subcat' ? (
                      <input
                        autoFocus
                        className="flex-1 p-1 border rounded text-sm"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEditSubcategory()
                          if (e.key === 'Escape') { setEditingId(null); setEditingType(null) }
                        }}
                      />
                    ) : (
                      <span className={s.id < 0 ? 'text-gray-700' : ''}>{s.name} {s.id < 0 && <span className="text-xs text-gray-400">(par défaut)</span>}</span>
                    )}
                    <div className="flex gap-1">
                      {s.id < 0 ? (
                        // Sous-catégorie par défaut - pas d'actions
                        <span className="text-xs text-gray-400">-</span>
                      ) : editingId === s.id && editingType === 'subcat' ? (
                        <>
                          <button type="button" className="text-green-600 text-sm" onClick={handleSaveEditSubcategory}>✓</button>
                          <button type="button" className="text-gray-600 text-sm" onClick={() => { setEditingId(null); setEditingType(null) }}>✕</button>
                        </>
                      ) : (
                        <>
                          <button type="button" className="text-blue-600 text-sm" onClick={() => handleEditSubcategory(s.id, s.name)}>Éditer</button>
                          <button type="button" className="text-red-600 text-sm" onClick={() => handleDeleteSubcat(s.id)}>Supprimer</button>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Section Objectifs personnalisés */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">🎯 Objectifs personnalisés</h2>
        <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-md border border-blue-200">
          💡 Les objectifs créés ici seront automatiquement affichés sur la page d'accueil avec leur progression.
        </p>
        
        {/* Formulaire d'ajout/modification */}
        <div className="card p-4 mb-6">
          <h3 className="text-lg font-semibold mb-3">{editingGoal ? 'Modifier l\'objectif' : 'Nouvel objectif'}</h3>
          <form onSubmit={editingGoal ? handleUpdateGoal : handleAddGoal} className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm text-gray-600 mb-1">Nom de l'objectif</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Ex: Voyage au Japon"
                  value={editingGoal ? editingGoal.name : newGoal.name}
                  onChange={(e) => editingGoal 
                    ? setEditingGoal({...editingGoal, name: e.target.value})
                    : setNewGoal({...newGoal, name: e.target.value})
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Type d'objectif</label>
                <div className="flex gap-2">
                  <select 
                    className="flex-1 p-2 border rounded"
                    value={editingGoal ? editingGoal.type : newGoal.type}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '__custom__') {
                        setShowCustomTypeInput(true);
                      } else {
                        editingGoal
                          ? setEditingGoal({...editingGoal, type: value})
                          : setNewGoal({...newGoal, type: value});
                        setShowCustomTypeInput(false);
                      }
                    }}
                  >
                    {goalTypes.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                    <option value="__custom__">➕ Ajouter un type personnalisé</option>
                  </select>
                </div>
                {showCustomTypeInput && (
                  <div className="mt-2 flex gap-2">
                    <input 
                      type="text"
                      className="flex-1 p-2 border rounded text-sm"
                      placeholder="Nouveau type..."
                      value={customType}
                      onChange={(e) => setCustomType(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCustomType();
                        }
                        if (e.key === 'Escape') {
                          setShowCustomTypeInput(false);
                          setCustomType('');
                        }
                      }}
                      autoFocus
                    />
                    <button 
                      type="button"
                      className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                      onClick={handleAddCustomType}
                    >
                      ✓
                    </button>
                    <button 
                      type="button"
                      className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400"
                      onClick={() => {
                        setShowCustomTypeInput(false);
                        setCustomType('');
                      }}
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Montant cible ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded"
                  placeholder="5000"
                  value={editingGoal ? editingGoal.targetAmount : newGoal.targetAmount}
                  onChange={(e) => editingGoal
                    ? setEditingGoal({...editingGoal, targetAmount: parseFloat(e.target.value) || 0})
                    : setNewGoal({...newGoal, targetAmount: parseFloat(e.target.value) || 0})
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Montant actuel ($)</label>
                <input 
                  type="number"
                  step="0.01"
                  className="w-full p-2 border rounded"
                  placeholder="0"
                  value={editingGoal ? editingGoal.currentAmount : newGoal.currentAmount}
                  onChange={(e) => editingGoal
                    ? setEditingGoal({...editingGoal, currentAmount: parseFloat(e.target.value) || 0})
                    : setNewGoal({...newGoal, currentAmount: parseFloat(e.target.value) || 0})
                  }
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Date cible</label>
                <input 
                  type="date"
                  className="w-full p-2 border rounded"
                  value={editingGoal ? editingGoal.targetDate : newGoal.targetDate}
                  onChange={(e) => editingGoal
                    ? setEditingGoal({...editingGoal, targetDate: e.target.value})
                    : setNewGoal({...newGoal, targetDate: e.target.value})
                  }
                  min="1900-01-01"
                  max="2099-12-31"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <input 
                  type="text"
                  className="w-full p-2 border rounded"
                  placeholder="Notes optionnelles"
                  value={editingGoal ? editingGoal.notes || '' : newGoal.notes || ''}
                  onChange={(e) => editingGoal
                    ? setEditingGoal({...editingGoal, notes: e.target.value})
                    : setNewGoal({...newGoal, notes: e.target.value})
                  }
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
                {editingGoal ? 'Mettre à jour' : 'Ajouter l\'objectif'}
              </button>
              {editingGoal && (
                <button 
                  type="button" 
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                  onClick={() => setEditingGoal(null)}
                >
                  Annuler
                </button>
              )}
            </div>
          </form>
        </div>

        {/* Liste simplifiée des objectifs */}
        <div className="card p-4">
          <h3 className="text-lg font-semibold mb-3">Objectifs existants</h3>
          {goals.length === 0 ? (
            <p className="text-gray-500 text-sm">Aucun objectif créé pour le moment</p>
          ) : (
            <ul className="space-y-2">
              {goals.map((goal) => (
                <li key={goal.id} className="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
                  <div>
                    <span className="font-medium">{goal.name}</span>
                    <span className="text-xs text-gray-600 ml-2">({goal.type})</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="text-blue-600 text-sm hover:underline"
                      onClick={() => setEditingGoal(goal)}
                    >
                      ✏️ Modifier
                    </button>
                    <button 
                      className="text-red-600 text-sm hover:underline"
                      onClick={() => goal.id && handleDeleteGoal(goal.id)}
                    >
                      🗑️ Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Section Export/Import */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-2 text-gray-800">💾 Sauvegarde et restauration</h2>
        <p className="text-sm text-gray-600 mb-4 bg-yellow-50 p-3 rounded-md border border-yellow-200">
          ⚠️ Important: Exportez régulièrement vos données pour éviter toute perte. Le fichier contiendra toutes vos transactions, comptes, catégories et objectifs.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Export */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              📤 Exporter les données
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Télécharge un fichier JSON contenant toutes vos données. Conservez-le en lieu sûr.
            </p>
            <button
              onClick={handleExport}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
            >
              📥 Télécharger la sauvegarde
            </button>
          </div>

          {/* Import */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              📥 Importer les données
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Restaure vos données à partir d'un fichier de sauvegarde. <strong className="text-red-600">Remplace toutes les données actuelles!</strong>
            </p>
            <label className="w-full block">
              <input
                type="file"
                accept=".json"
                onChange={handleImport}
                disabled={isImporting}
                className="hidden"
                id="import-file"
              />
              <div className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors cursor-pointer text-center">
                {isImporting ? '⏳ Importation...' : '📂 Sélectionner un fichier'}
              </div>
            </label>
          </div>
        </div>
      </div>
    </div>
  )
}
