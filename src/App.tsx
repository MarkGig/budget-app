import React, { useEffect, useMemo, useState } from 'react'
import { addTransaction, getTransactions, Transaction, deleteTransaction, updateTransaction, getAccounts, Account } from './db'
import TransactionForm from './components/TransactionForm'
import TransactionList from './components/TransactionList'
import GroupedTransactionList from './components/GroupedTransactionList'
import ExpenseSummary from './components/ExpenseSummary'
import CategoryPieChart from './components/CategoryPieChart'
import CategoryManagementPage from './pages/CategoryManagementPage'
import InvestmentsPage from './pages/InvestmentsPage'
import LiabilitiesPage from './pages/LiabilitiesPage'
import ReportsPage from './pages/ReportsPage'
import HomePage from './pages/HomePage'
import NavBar from './components/NavBar'
import InformationPage from './pages/InformationPage'
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns'

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [page, setPage] = useState(0)
  const pageSize = 100
  const [currentPage, setCurrentPage] = useState<'home' | 'budget' | 'categories' | 'investments' | 'reports' | 'information' | 'liabilities'>(() => {
    const h = window.location.hash || ''
    if (h.startsWith('#/home')) return 'home'
    if (h.startsWith('#/categories')) return 'categories'
    if (h.startsWith('#/investments')) return 'investments'
    if (h.startsWith('#/sommaire')) return 'reports'
    if (h.startsWith('#/information')) return 'information'
    if (h.startsWith('#/liabilities')) return 'liabilities'
    return 'budget'
  })
  const [periodView, setPeriodView] = useState<'week' | 'month' | 'year'>('month')
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  // Navigation is managed via state (`currentPage`) instead of URL hash changes.

  useEffect(() => {
    loadPage(0)
    loadAccounts()
  }, [])

  async function loadAccounts() {
    const accs = await getAccounts()
    setAccounts(accs)
  }

  async function loadPage(pageNumber: number) {
    const results = await getTransactions(pageNumber * pageSize, pageSize)
    if (pageNumber === 0) setTransactions(results)
    else setTransactions((s) => [...s, ...results])
    setPage(pageNumber)
  }

  // Suppression d'une transaction sans effacer tout le tableau
  async function handleDeleteTransaction(tx: Transaction) {
    if (!window.confirm('Supprimer cette transaction ?')) return;
    if (tx.id !== undefined) {
      await deleteTransaction(tx.id);
      setTransactions((s) => s.filter((t) => t.id !== tx.id));
    }
  }

  // Edition d'une transaction (inline)
  async function handleEditTransaction(tx: Transaction) {
    await updateTransaction(tx);
    setTransactions((s) => s.map((t) => t.id === tx.id ? { ...t, ...tx } : t));
  }

  async function handleAdd(tx: Omit<Transaction, 'id'>) {
    const id = await addTransaction(tx)
    setTransactions((s) => [{ ...tx, id: Number(id) }, ...s])
  }

  // Filtrage des transactions selon la période sélectionnée
  const now = new Date();
  let periodStart: Date, periodEnd: Date;
  if (periodView === 'week') {
    periodStart = startOfWeek(now, { weekStartsOn: 1 });
    periodEnd = endOfWeek(now, { weekStartsOn: 1 });
  } else if (periodView === 'year') {
    periodStart = startOfYear(now);
    periodEnd = endOfYear(now);
  } else {
    periodStart = startOfMonth(now);
    periodEnd = endOfMonth(now);
  }
  const filteredTransactions = transactions.filter(t => {
    const d = parseISO(t.date);
    return isWithinInterval(d, { start: periodStart, end: periodEnd });
  });
  const totals = useMemo(() => {
    const income = filteredTransactions.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
    const expense = filteredTransactions.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
    const savings = filteredTransactions.filter((t) => t.type === 'savings').reduce((s, t) => s + t.amount, 0)
    const retirement = filteredTransactions.filter((t) => t.type === 'savings' && t.category === 'Retraite').reduce((s, t) => s + t.amount, 0)
    
    // Calculate available funds (checking + savings accounts)
    const checkingBalance = accounts
      .filter(acc => acc.type === 'Chèque')
      .reduce((sum, acc) => sum + acc.balance, 0)
    const savingsBalance = accounts
      .filter(acc => acc.type === 'Épargne')
      .reduce((sum, acc) => sum + acc.balance, 0)
    const availableFunds = checkingBalance + savingsBalance
    
    return { income, expense, savings, retirement, balance: income - expense, availableFunds, checkingBalance }
  }, [filteredTransactions, accounts])

  function handleNavigate(page: 'home' | 'budget' | 'categories' | 'investments' | 'reports' | 'information' | 'liabilities') {
    // Update internal state only (single source of truth for navigation)
    if (page === 'home') {
      setCurrentPage('home')
    } else if (page === 'budget') {
      setCurrentPage('budget')
    } else if (page === 'categories') {
      setCurrentPage('categories')
    } else if (page === 'investments') {
      setCurrentPage('investments')
    } else if (page === 'reports') {
      setCurrentPage('reports')
    } else if (page === 'information') {
      setCurrentPage('information')
    } else if (page === 'liabilities') {
      setCurrentPage('liabilities')
    }
  }

  let pageContent = null;
  switch (currentPage) {
    case 'home':
      pageContent = <HomePage />;
      break;
    case 'categories':
      pageContent = <CategoryManagementPage onClose={() => {}} />;
      break;
    case 'investments':
      pageContent = <InvestmentsPage onClose={() => {}} />;
      break;
    case 'reports':
      pageContent = <ReportsPage />;
      break;
    case 'information':
      pageContent = <InformationPage />;
      break;
    case 'liabilities':
      pageContent = <LiabilitiesPage onClose={() => setCurrentPage('home')} />;
      break;
    default:
      pageContent = (
        <section className="p-6 max-w-7xl mx-auto">
          {/* 5 cases en haut sur toute la largeur */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            <div className="card">
              <div className="text-sm text-gray-500">Disponible</div>
              <div className={`text-2xl font-bold ${totals.availableFunds >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.availableFunds.toFixed(2)}$</div>
              <div className="text-xs text-gray-400 mt-1">Chèque + Épargne</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Compte chèque</div>
              <div className={`text-lg font-semibold ${totals.checkingBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>{totals.checkingBalance.toFixed(2)}$</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Revenus</div>
              <div className="text-lg text-green-600 font-semibold">{totals.income.toFixed(2)}$</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Dépenses</div>
              <div className="text-lg text-red-600 font-semibold">{totals.expense.toFixed(2)}$</div>
            </div>
            <div className="card">
              <div className="text-sm text-gray-500">Épargne</div>
              <div className="text-lg text-blue-600 font-semibold">{totals.savings.toFixed(2)}$</div>
            </div>
          </div>

          {/* Layout en deux colonnes pour le reste */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Colonne gauche */}
            <div className="space-y-6">
              <div className="card">
                <TransactionForm onAdd={handleAdd} />
              </div>
              <div className="card">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold mb-2 text-gray-800">{showAllTransactions ? 'Transactions' : 'Dernières transactions'}</h2>
                  <button className="text-sm text-blue-600 hover:underline" onClick={() => setShowAllTransactions(s => !s)}>
                    {showAllTransactions ? 'Réduire' : 'Tout afficher'}
                  </button>
                </div>
                <GroupedTransactionList 
                  transactions={showAllTransactions ? transactions : transactions.slice(0, 20)}
                  onEdit={handleEditTransaction}
                  onDelete={handleDeleteTransaction}
                  onRefresh={() => loadPage(0)}
                />
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-6">
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Dépenses par catégorie</h2>
                <div className="flex justify-center mb-4">
                  <CategoryPieChart transactions={filteredTransactions} />
                </div>
                <div className="mt-4">
                  <ExpenseSummary transactions={filteredTransactions} />
                </div>
              </div>
              <div className="card">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Répartition des dettes</h2>
                <div className="flex justify-center">
                  <CategoryPieChart 
                    transactions={accounts
                      .filter(acc => ['Marge de crédit', 'Marge de crédit hypothécaire', 'Prêt', 'Carte de crédit', 'Hypothèque'].includes(acc.type))
                      .map(acc => ({ 
                        id: acc.id, 
                        date: new Date().toISOString().slice(0, 10), 
                        amount: acc.balance, 
                        category: acc.name, 
                        description: acc.type, 
                        type: 'expense' as const,
                        periodicity: 'Aucune' as const
                      }))} 
                    size={280}
                    showPercentInPie={true}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Bouton charger plus en bas */}
          <div className="mt-6 text-center">
            <button className="btn" onClick={() => loadPage(Number(page) + 1)}>Charger plus</button>
          </div>
        </section>
      );
  }

  return (
    <>
      <NavBar onNavigate={handleNavigate} currentPage={currentPage} />
      <div className="app">
        <header className="flex items-center justify-between" />
        {pageContent}
      </div>
    </>
  );
}
