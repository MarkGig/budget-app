import React, { useEffect, useState, useMemo } from 'react'
import { Account, getAccounts, Transaction, getTransactions } from '../db'
import CategoryPieChart from '../components/CategoryPieChart'
import GroupedTransactionList from '../components/GroupedTransactionList'

export default function InvestmentsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [showAllTransactions, setShowAllTransactions] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    const accs = await getAccounts()
    const txs = await getTransactions(0, 10000)
    setAccounts(accs)
    setTransactions(txs)
  }

  // Filtrer les comptes de placement
  const investmentAccounts = useMemo(() => {
    return accounts.filter(acc => 
      acc.type === 'CELI' || 
      acc.type === 'CELIAPP' ||
      acc.type === 'REER' || 
      acc.type === 'Fonds de travailleurs' || 
      acc.type === 'Placements'
    )
  }, [accounts])

  // Total des placements
  const totalInvestments = useMemo(() => {
    return investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  }, [investmentAccounts])

  // Regrouper par type
  const investmentsByType = useMemo(() => {
    const grouped: Record<string, { total: number; accounts: Account[] }> = {}
    
    investmentAccounts.forEach(acc => {
      if (!grouped[acc.type]) {
        grouped[acc.type] = { total: 0, accounts: [] }
      }
      grouped[acc.type].total += acc.balance
      grouped[acc.type].accounts.push(acc)
    })
    
    return grouped
  }, [investmentAccounts])

  // Transactions d'épargne/placement récentes
  const investmentTransactions = useMemo(() => {
    const investmentAccountIds = new Set(investmentAccounts.map(acc => acc.id))
    const today = new Date().toISOString().slice(0, 10)
    return transactions
      .filter(tx => {
        // Inclure les transactions de type savings OU liées à un compte de placement
        // ET seulement celles avant ou égales à aujourd'hui
        return (tx.type === 'savings' || (tx.accountId && investmentAccountIds.has(tx.accountId))) && tx.date <= today
      })
      .sort((a, b) => b.date.localeCompare(a.date))
  }, [transactions, investmentAccounts])

  const displayedTransactions = useMemo(() => {
    return showAllTransactions ? investmentTransactions : investmentTransactions.slice(0, 20)
  }, [investmentTransactions, showAllTransactions])

  // Préparer les données pour le graphique
  const chartData = useMemo(() => {
    return investmentAccounts.map(acc => ({
      ...acc,
      amount: acc.balance,
      category: acc.name
    })) as any[]
  }, [investmentAccounts])

  const colorMap = useMemo(() => {
    const map: Record<string, string> = {}
    investmentAccounts.forEach((acc, i) => {
      const hue = Math.floor((i * 137.508) % 360)
      map[acc.name] = `hsl(${hue} 70% 75%)`
    })
    return map
  }, [investmentAccounts])

  const formatAmount = (amount: number) => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Mes placements</h1>

      {/* Résumé total */}
      <div className="card p-6 mb-6 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg text-gray-600 mb-2">Valeur totale des placements</h2>
            <p className="text-4xl font-bold text-indigo-600">{formatAmount(totalInvestments)} $</p>
          </div>
          <div className="text-5xl">💰</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Répartition par type */}
        <div className="card p-4">
          <h2 className="text-xl font-semibold mb-4">Répartition par type</h2>
          {investmentAccounts.length > 0 ? (
            <div className="flex items-center justify-center">
              <CategoryPieChart 
                transactions={chartData} 
                size={280} 
                colorMap={colorMap}
                showPercentInPie
              />
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">Aucun placement enregistré</p>
          )}
        </div>

        {/* Détail par type */}
        <div className="card p-4">
          <h2 className="text-xl font-semibold mb-4">Détail par type</h2>
          <div className="space-y-3">
            {Object.entries(investmentsByType).map(([type, data]) => (
              <div key={type} className="border-l-4 border-indigo-500 pl-4 py-2 bg-gray-50 rounded">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-gray-800">{type}</span>
                  <span className="text-lg font-bold text-indigo-600">{formatAmount(data.total)} $</span>
                </div>
                <div className="text-sm text-gray-600">
                  {data.accounts.map(acc => acc.name).join(', ')}
                </div>
              </div>
            ))}
            {Object.keys(investmentsByType).length === 0 && (
              <p className="text-gray-500 text-center py-4">Aucun placement</p>
            )}
          </div>
        </div>
      </div>

      {/* Liste des comptes de placement */}
      <div className="card p-4 mb-6">
        <h2 className="text-xl font-semibold mb-4">Comptes de placement</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {investmentAccounts.map(account => (
            <div key={account.id} className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-semibold text-gray-800">{account.name}</h3>
                  <p className="text-xs text-gray-500">{account.type}</p>
                </div>
              </div>
              <div className={`text-2xl font-bold ${account.balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatAmount(account.balance)} $
              </div>
            </div>
          ))}
          {investmentAccounts.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              <p>Aucun compte de placement</p>
              <p className="text-sm mt-2">Créez un compte dans "Mes comptes" ou ajoutez une transaction d'épargne</p>
            </div>
          )}
        </div>
      </div>

      {/* Transactions récentes */}
      <div className="card p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Transactions récentes</h2>
          {investmentTransactions.length > 20 && (
            <button
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="text-sm text-blue-600 hover:text-blue-800 underline"
            >
              {showAllTransactions ? 'Afficher moins' : `Afficher tout (${investmentTransactions.length})`}
            </button>
          )}
        </div>
        {investmentTransactions.length > 0 ? (
          <GroupedTransactionList
            transactions={displayedTransactions}
            onRefresh={loadData}
          />
        ) : (
          <p className="text-gray-500 text-center py-8">Aucune transaction d'épargne enregistrée</p>
        )}
      </div>
    </div>
  )
}
