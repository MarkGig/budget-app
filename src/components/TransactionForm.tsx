import React, { useEffect, useState } from 'react'
import type { Transaction, Periodicity, Account } from '../db'
import { addCategory, getCategories, getSubcategories, getAccounts } from '../db'
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES, DEFAULT_SAVINGS_CATEGORIES } from '../defaultCategories'
const MAISON_SUBCATEGORIES = ['Assurance', 'Hypothèque', 'Rénovations']
const VOITURE_SUBCATEGORIES = ['Essence', 'Réparation', 'Assurance', 'Paiement', 'Autres']

export default function TransactionForm({ onAdd }: { onAdd: (tx: Omit<Transaction, 'id'>) => void }) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState<'income' | 'expense' | 'savings'>('expense')
  const [category, setCategory] = useState<string>('Épicerie')
  const [subcategory, setSubcategory] = useState<string | ''>('')
  const [subcategoryOptions, setSubcategoryOptions] = useState<string[]>([])
  const [periodicity, setPeriodicity] = useState<Periodicity>('Aucune')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [accountId, setAccountId] = useState<number | undefined>(undefined)
  const [accounts, setAccounts] = useState<Account[]>([])

  const [expenseCategories, setExpenseCategories] = useState<string[]>(DEFAULT_EXPENSE_CATEGORIES)
  const [incomeCategories, setIncomeCategories] = useState<string[]>(DEFAULT_INCOME_CATEGORIES)
  const [savingsCategories, setSavingsCategories] = useState<string[]>(DEFAULT_SAVINGS_CATEGORIES)
  const [showNewCategoryForm, setShowNewCategoryForm] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')

  const [recurrenceStart, setRecurrenceStart] = useState('');
  const [recurrenceEnd, setRecurrenceEnd] = useState('');
  const [noEndDate, setNoEndDate] = useState(false); // Par défaut, la date de fin n'est pas cochée
  const [recurrenceDay, setRecurrenceDay] = useState('Lundi');
  const weekDays = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  const periodicityOptions: Periodicity[] = ['Aucune', 'Hebdomadaire', 'Aux 2 semaines', 'Bi-mensuel', 'Mensuel', 'Annuel']
  const categories = type === 'expense' ? expenseCategories : type === 'income' ? incomeCategories : savingsCategories

  useEffect(() => {
    loadCategories()
    loadAccounts()
  }, [])

  async function loadAccounts() {
    const accs = await getAccounts()
    // Filtrer uniquement les comptes utilisables pour les transactions
    const usableAccounts = accs.filter(a => 
      a.type === 'Chèque' || 
      a.type === 'Épargne' || 
      a.type === 'Carte de crédit' || 
      a.type === 'Marge de crédit'
    )
    setAccounts(usableAccounts)
    // Définir le compte chèque par défaut si disponible
    const chequeAccount = usableAccounts.find(a => a.type === 'Chèque')
    if (chequeAccount) {
      setAccountId(chequeAccount.id)
    }
  }

  useEffect(() => {
    // load dynamic subcategories for selected category
    let mounted = true
    ;(async () => {
      const subs = await getSubcategories(category)
      if (!mounted) return
      setSubcategoryOptions(subs.map((s: any) => s.name))
    })()
    return () => { mounted = false }
  }, [category])

  // If user selects a periodicity, default the recurrence start to the selected date (if empty)
  useEffect(() => {
    if (periodicity !== 'Aucune' && !recurrenceStart) {
      setRecurrenceStart(date)
    }
  }, [periodicity, date, recurrenceStart])

  async function loadCategories() {
    const expenses = await getCategories('expense')
    const incomes = await getCategories('income')
    const savings = await getCategories('savings')
    setExpenseCategories([
      ...DEFAULT_EXPENSE_CATEGORIES,
      ...expenses.filter((c) => !DEFAULT_EXPENSE_CATEGORIES.includes(c)),
    ])
    setIncomeCategories([
      ...DEFAULT_INCOME_CATEGORIES,
      ...incomes.filter((c) => !DEFAULT_INCOME_CATEGORIES.includes(c)),
    ])
    setSavingsCategories([
      ...DEFAULT_SAVINGS_CATEGORIES,
      ...savings.filter((c) => !DEFAULT_SAVINGS_CATEGORIES.includes(c)),
    ])
  }

  const handleTypeChange = (newType: 'income' | 'expense' | 'savings') => {
    setType(newType)
    let cats: string[] = []
    if (newType === 'expense') cats = expenseCategories
    else if (newType === 'income') cats = incomeCategories
    else cats = savingsCategories
    setCategory(cats[0] || 'Autre')
    setSubcategory('')
  }

  const handleCategoryChange = (newCategory: string) => {
    setCategory(newCategory)
    setSubcategory('')
  }

  async function handleAddNewCategory(e: React.FormEvent) {
    e.preventDefault()
    if (!newCategoryName.trim()) return
    // Persist custom categories for any type (including savings)
    await addCategory({ name: newCategoryName, type })
    if (type === 'expense') setExpenseCategories([...expenseCategories, newCategoryName])
    else if (type === 'income') setIncomeCategories([...incomeCategories, newCategoryName])
    else setSavingsCategories([...savingsCategories, newCategoryName])
    setCategory(newCategoryName)
    setNewCategoryName('')
    setShowNewCategoryForm(false)
  }

  // Pour toutes les périodicités, gérer la logique de génération selon date ou jour
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount);
    if (!description || Number.isNaN(amt)) return;
    if (periodicity === 'Aucune') {
      await onAdd({ 
        description, 
        amount: amt, 
        type, 
        category, 
        subcategory: (category === 'Maison' || category === 'Voiture') ? (subcategory as any) : undefined,
        periodicity, 
        date 
      });
    } else {
      const start = recurrenceStart || date;
      const end = noEndDate ? null : recurrenceEnd;
      let current = new Date(start);
      const txs = [];
      let count = 0;
      while ((!end || current <= new Date(end)) && count < 200) {
        // Pour toutes les périodicités, ajuster au bon jour si pas de date de début
        if (!recurrenceStart) {
          if (periodicity === 'Hebdomadaire') {
            const dayIdx = weekDays.indexOf(recurrenceDay);
            if (current.getDay() !== ((dayIdx + 1) % 7)) {
              current.setDate(current.getDate() + ((dayIdx + 7 - current.getDay()) % 7));
            }
          }
          if (periodicity === 'Mensuel' || periodicity === 'Bi-mensuel' || periodicity === 'Aux 2 semaines') {
            // Pour mensuel et bi-mensuel, utiliser le jour du mois de la date actuelle
            // Pour aux 2 semaines, utiliser la date actuelle
          }
        }
        txs.push({
          description,
          amount: amt,
          type,
          category,
          subcategory: (category === 'Maison' || category === 'Voiture') ? (subcategory as any) : undefined,
          periodicity,
          date: current.toISOString().slice(0, 10),
          accountId: accountId || undefined,
        });
        // Avancer à la prochaine occurrence
        if (periodicity === 'Hebdomadaire') current.setDate(current.getDate() + 7);
        else if (periodicity === 'Aux 2 semaines') current.setDate(current.getDate() + 14);
        else if (periodicity === 'Bi-mensuel') current.setDate(current.getDate() + 15);
        else if (periodicity === 'Mensuel') current.setMonth(current.getMonth() + 1);
        else if (periodicity === 'Annuel') current.setFullYear(current.getFullYear() + 1);
        else break;
        count++;
      }
      for (const tx of txs) await onAdd(tx);
    }
    setDescription('');
    setAmount('');
    setPeriodicity('Aucune');
    setSubcategory('');
    setRecurrenceStart('');
    setRecurrenceEnd('');
    setNoEndDate(false);
    setRecurrenceDay('Lundi');
  }

  return (
    <form onSubmit={handleSubmit} className="tx-form space-y-3">
      <div>
        <label className="block text-sm text-gray-600">Montant</label>
        <input className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm text-gray-600">Description</label>
        <input className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={description} onChange={(e) => setDescription(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600">Type</label>
          <select className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={type} onChange={(e) => handleTypeChange(e.target.value as any)}>
            <option value="expense">Dépense</option>
            <option value="income">Revenu</option>
            <option value="savings">Épargne</option>
          </select>
        </div>
        <div>
          <label className="block text-sm text-gray-600">Catégorie</label>
          <select className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={category} onChange={(e) => handleCategoryChange(e.target.value)}>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Compte source */}
      <div>
        <label className="block text-sm text-gray-600">Payé avec (optionnel)</label>
        <select 
          className="mt-1 p-2 rounded-md border border-gray-200 w-full" 
          value={accountId || ''} 
          onChange={(e) => setAccountId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">-- Aucun compte --</option>
          {accounts.map((acc) => (
            <option key={acc.id} value={acc.id}>{acc.name} ({acc.type})</option>
          ))}
        </select>
      </div>

      {/* show subcategory select if defaults or dynamic subcategories exist */}
      {((category === 'Maison' && MAISON_SUBCATEGORIES.length > 0) || (category === 'Voiture' && VOITURE_SUBCATEGORIES.length > 0) || subcategoryOptions.length > 0) && (
        <div>
          <label className="block text-sm text-gray-600">Sous-catégorie</label>
          <select className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
            <option value="">-- Sélectionner --</option>
            {category === 'Maison' && MAISON_SUBCATEGORIES.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            {category === 'Voiture' && VOITURE_SUBCATEGORIES.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
            {subcategoryOptions.filter(sub => {
              if (category === 'Maison') return !MAISON_SUBCATEGORIES.includes(sub);
              if (category === 'Voiture') return !VOITURE_SUBCATEGORIES.includes(sub);
              return true;
            }).map((sub) => <option key={sub} value={sub}>{sub}</option>)}
          </select>
        </div>
      )}

      {showNewCategoryForm && (
        <div className="space-y-2 p-3 bg-blue-50 rounded-md">
          <input 
            className="w-full p-2 rounded-md border border-blue-200" 
            placeholder={`Nouvelle catégorie ${type}`}
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleAddNewCategory}
              className="flex-1 px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Créer
            </button>
            <button
              type="button"
              onClick={() => { setShowNewCategoryForm(false); setNewCategoryName('') }}
              className="flex-1 px-3 py-1 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
            >
              Annuler
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm text-gray-600">Périodicité</label>
          <select className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={periodicity} onChange={(e) => setPeriodicity(e.target.value as any)}>
            {periodicityOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col items-end">
          <label className="block text-sm text-gray-600">Date</label>
          <input
            type="date"
            className={`mt-1 p-2 rounded-md border border-gray-200 ${periodicity !== 'Aucune' ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
            value={date}
            onChange={e => setDate(e.target.value)}
            disabled={periodicity !== 'Aucune'}
          />
          <a
            href="#"
            className="text-sm text-blue-600 mt-2 hover:underline"
            onClick={(e) => { e.preventDefault(); setShowNewCategoryForm(true); }}
          >
            + Catégorie
          </a>
        </div>
      </div>
      {periodicity !== 'Aucune' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm text-gray-600">Début de la récurrence</label>
            <input type="date" className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={recurrenceStart} onChange={e => setRecurrenceStart(e.target.value)} min="1900-01-01" max="2099-12-31" />
          </div>
          <div>
            <label className="block text-sm text-gray-600">Fin de la récurrence</label>
            <input type="date" className="mt-1 p-2 rounded-md border border-gray-200 w-full" value={recurrenceEnd} onChange={e => setRecurrenceEnd(e.target.value)} disabled={noEndDate} min="1900-01-01" max="2099-12-31" />
            <label className="inline-flex items-center mt-1 ml-2">
              <input type="checkbox" checked={noEndDate} onChange={e => setNoEndDate(e.target.checked)} className="mr-1" /> Pas de date de fin
            </label>
          </div>
          {(periodicity === 'Hebdomadaire' || periodicity === 'Mensuel' || periodicity === 'Bi-mensuel' || periodicity === 'Aux 2 semaines') && (
            <div>
              <label className="block text-sm text-gray-600">Jour de la semaine</label>
              <select
                className="mt-1 p-2 rounded-md border border-gray-200 w-full"
                value={recurrenceDay}
                onChange={e => setRecurrenceDay(e.target.value)}
                disabled={!!recurrenceStart}
              >
                {weekDays.map(day => <option key={day} value={day}>{day}</option>)}
              </select>
              {recurrenceStart && (
                <div className="text-xs text-gray-400 mt-1">Le jour de la semaine est ignoré si une date de début est choisie.</div>
              )}
            </div>
          )}
        </div>
      )}
      <div>
        <button className="btn w-full" type="submit">Ajouter</button>
      </div>
    </form>
  )
}

