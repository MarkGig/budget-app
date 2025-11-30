import React, { useEffect, useState, useMemo } from 'react';
import { Account, getAccounts, getTransactions, Transaction, Goal, getGoals } from '../db';
import { formatAmount } from '../utils/formatters';

const STORAGE_KEY = 'homePageData_v1';

export default function HomePage() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [savingsTooltip, setSavingsTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    category: string;
    transactions: Transaction[];
  } | null>(null);

  useEffect(() => {
    async function fetchData() {
      const accs = await getAccounts();
      setAccounts(accs);
      const txs = await getTransactions(0, 1000);
      setTransactions(txs);
      const goalsData = await getGoals();
      setGoals(goalsData);
    }
    fetchData();
  }, []);

  // Définir les types d'actifs et de passifs
  const actifsTypes = [
    'Chèque', 'Épargne', 'CELI', 'CELIAPP', 'REER', 'Fonds de travailleurs', 'Placements'
  ];
  const passifsTypes = [
    'Marge de crédit', 'Marge de crédit hypothécaire', 'Prêt', 'Carte de crédit', 'Hypothèque'
  ];

  const totalActifs = accounts
    .filter(acc => actifsTypes.includes(acc.type))
    .reduce((sum, acc) => sum + acc.balance, 0);
  const totalPassifs = accounts
    .filter(acc => passifsTypes.includes(acc.type))
    .reduce((sum, acc) => sum + acc.balance, 0);

  // Calculer les statistiques d'épargne
  const savingsStats = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // Format YYYY-MM-DD
    const currentMonth = now.toISOString().slice(0, 7);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 7);
    
    // Épargne du mois en cours (seulement jusqu'à aujourd'hui)
    const currentMonthSavings = transactions
      .filter(t => t.type === 'savings' && t.date.startsWith(currentMonth) && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Épargne du mois dernier (seulement jusqu'à aujourd'hui)
    const lastMonthSavings = transactions
      .filter(t => t.type === 'savings' && t.date.startsWith(lastMonth) && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Total épargne cumulée (seulement jusqu'à aujourd'hui)
    const totalSavings = transactions
      .filter(t => t.type === 'savings' && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0);
    
    // Répartition par catégorie (seulement jusqu'à aujourd'hui)
    const byCategory: Record<string, number> = {};
    transactions
      .filter(t => t.type === 'savings' && t.date <= today)
      .forEach(t => {
        const cat = t.category || 'Autre';
        byCategory[cat] = (byCategory[cat] || 0) + t.amount;
      });
    
    const categories = Object.entries(byCategory)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);
    
    // Évolution sur 6 derniers mois (pour mini graphique, seulement jusqu'à aujourd'hui)
    const monthlyData: number[] = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = date.toISOString().slice(0, 7);
      const amount = transactions
        .filter(t => t.type === 'savings' && t.date.startsWith(monthStr) && t.date <= today)
        .reduce((sum, t) => sum + t.amount, 0);
      monthlyData.push(amount);
    }
    
    // Progression
    const progression = lastMonthSavings > 0 
      ? ((currentMonthSavings - lastMonthSavings) / lastMonthSavings) * 100 
      : 0;
    
    // Taux d'épargne (% du revenu, seulement jusqu'à aujourd'hui)
    const currentMonthIncome = transactions
      .filter(t => t.type === 'income' && t.date.startsWith(currentMonth) && t.date <= today)
      .reduce((sum, t) => sum + t.amount, 0);
    const savingsRate = currentMonthIncome > 0 ? (currentMonthSavings / currentMonthIncome) * 100 : 0;
    
    return {
      currentMonthSavings,
      totalSavings,
      categories,
      monthlyData,
      progression,
      savingsRate
    };
  }, [transactions]);

  // Générer le mini graphique sparkline
  const generateSparkline = (data: number[]) => {
    if (data.length === 0) return '';
    const max = Math.max(...data, 1);
    const bars = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
    return data.map(val => {
      const index = Math.min(Math.floor((val / max) * bars.length), bars.length - 1);
      return bars[index];
    }).join('');
  };

  const calculateProgress = (goal: Goal): number => {
    if (goal.targetAmount === 0) return 0;
    return Math.min((goal.currentAmount / goal.targetAmount) * 100, 100);
  };

  const categoryColors: Record<string, string> = {
    'Retraite': '🔵',
    'Urgence': '🟢',
    'Projet': '🟡',
    'Autre': '⚪'
  };

  const handleCategoryClick = (e: React.MouseEvent, category: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    const categoryTransactions = transactions
      .filter(t => t.type === 'savings' && (t.category || 'Autre') === category && t.date <= today)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setSavingsTooltip({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      category,
      transactions: categoryTransactions
    });
  };

  const closeSavingsTooltip = () => {
    setSavingsTooltip(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Accueil</h1>
      </div>

      {/* Somme des actifs et passifs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-green-50 p-4 rounded-lg flex flex-col items-center">
          <div className="text-sm text-gray-600 font-medium mb-1">Somme des actifs</div>
          <div className="text-2xl font-bold text-green-700">{formatAmount(totalActifs)} $</div>
        </div>
        <div className="bg-red-50 p-4 rounded-lg flex flex-col items-center">
          <div className="text-sm text-gray-600 font-medium mb-1">Somme des passifs</div>
          <div className="text-2xl font-bold text-red-700">{formatAmount(totalPassifs)} $</div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Widget Suivi d'épargne */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            📊 Suivi d'épargne
          </h2>
          
          {/* Total épargné */}
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="text-3xl font-bold text-blue-700 mb-1">
              {formatAmount(savingsStats.totalSavings)} $
            </div>
            <div className="text-sm text-gray-600">Total épargné</div>
            <div className={`text-sm font-medium mt-2 ${savingsStats.progression >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {savingsStats.progression >= 0 ? '▲' : '▼'} {Math.abs(savingsStats.progression).toFixed(1)}% ce mois
            </div>
            
            {/* Mini graphique sparkline */}
            <div className="mt-3">
              <div className="text-2xl text-blue-600 tracking-wider">
                {generateSparkline(savingsStats.monthlyData)}
              </div>
              <div className="text-xs text-gray-500 mt-1">📊 Évolution sur 6 derniers mois</div>
            </div>
          </div>
          
          {/* Top catégories */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-600 mb-2">Top catégories:</div>
            <div className="space-y-2">
              {savingsStats.categories.map(([cat, amount]) => {
                const percentage = savingsStats.totalSavings > 0 
                  ? (amount / savingsStats.totalSavings) * 100 
                  : 0;
                return (
                  <div 
                    key={cat} 
                    className="flex items-center justify-between text-sm cursor-pointer hover:bg-blue-50 p-2 rounded transition-colors"
                    onClick={(e) => handleCategoryClick(e, cat)}
                  >
                    <div className="flex items-center gap-2">
                      <span>{categoryColors[cat] || '⚪'}</span>
                      <span className="text-gray-700">{cat}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{amount.toFixed(0)} $</span>
                      <span className="text-gray-500">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* Taux d'épargne */}
          <div className="pt-3 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-600">Taux d'épargne:</span>
              <span className="font-bold text-blue-700">{savingsStats.savingsRate.toFixed(1)}%</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">(du revenu mensuel)</div>
          </div>
        </div>

        {/* Comptes et placements */}
        <div className="card p-4">
          <h2 className="text-lg font-semibold mb-3">💰 Comptes et placements</h2>
          <div className="space-y-3">
            {accounts.length === 0 && <div className="text-gray-500">Aucun compte</div>}
            {accounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-gray-600">{acc.type}</div>
                  <div className="font-semibold">{acc.name}</div>
                </div>
                <div className="text-lg font-semibold">{formatAmount(acc.balance)}$</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Objectifs personnalisés */}
      <div className="card p-4">
        <h2 className="text-lg font-semibold mb-3">🎯 Mes objectifs</h2>
        {goals.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Aucun objectif défini</p>
            <p className="text-sm mt-2">Allez dans Personnalisation pour créer vos objectifs</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {goals.map((goal) => {
              const progress = calculateProgress(goal);
              const daysRemaining = goal.targetDate ? Math.ceil((new Date(goal.targetDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
              
              return (
                <div key={goal.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-lg">{goal.name}</h4>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{goal.type}</span>
                    </div>
                  </div>
                  
                  {/* Barre de progression */}
                  <div className="mb-3">
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="font-semibold">{formatAmount(goal.currentAmount)} $</span>
                      <span className="text-gray-600">{formatAmount(goal.targetAmount)} $</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          progress >= 100 ? 'bg-green-500' : progress >= 75 ? 'bg-blue-500' : progress >= 50 ? 'bg-yellow-500' : 'bg-orange-500'
                        }`}
                        style={{ width: `${progress}%` }}
                      ></div>
                    </div>
                    <div className="text-xs text-gray-600 mt-1">{progress.toFixed(1)}% complété</div>
                  </div>

                  {/* Informations supplémentaires */}
                  <div className="text-sm space-y-1">
                    {goal.targetDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">📅 Date cible:</span>
                        <span className="font-medium">{new Date(goal.targetDate).toLocaleDateString('fr-CA')}</span>
                      </div>
                    )}
                    {daysRemaining !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-gray-600">⏱️ Jours restants:</span>
                        <span className={`font-medium ${daysRemaining < 0 ? 'text-red-600' : daysRemaining < 30 ? 'text-orange-600' : 'text-green-600'}`}>
                          {daysRemaining < 0 ? `${Math.abs(daysRemaining)} jours écoulés` : `${daysRemaining} jours`}
                        </span>
                      </div>
                    )}
                    {goal.notes && (
                      <div className="pt-2 border-t mt-2">
                        <span className="text-gray-600 text-xs italic">{goal.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Overlay pour les détails des épargnes */}
      {savingsTooltip && (
        <>
          <div 
            className="fixed inset-0 z-[90]" 
            onClick={closeSavingsTooltip}
          ></div>
          <div 
            className="fixed bg-white border-2 border-blue-500 rounded-lg shadow-2xl p-4 z-[100] min-w-[400px] max-w-[500px]"
            style={{ 
              left: `${savingsTooltip.x + 15}px`, 
              top: `${savingsTooltip.y - 10}px` 
            }}
          >
            <div className="flex items-center justify-between mb-3 pb-2 border-b">
              <h3 className="font-bold text-lg">
                {categoryColors[savingsTooltip.category] || '⚪'} {savingsTooltip.category}
              </h3>
              <button 
                onClick={closeSavingsTooltip}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>
            <div className="text-sm text-gray-600 mb-2">
              {savingsTooltip.transactions.length} transaction(s)
            </div>
            <div className="max-h-[300px] overflow-y-auto space-y-2">
              {savingsTooltip.transactions.slice(0, 8).map((t, idx) => (
                <div key={idx} className="bg-gray-50 p-2 rounded text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold">{t.amount.toFixed(2)} $</span>
                    <span className="text-gray-500">{new Date(t.date).toLocaleDateString('fr-CA')}</span>
                  </div>
                  {t.description && (
                    <div className="text-gray-600 text-xs">{t.description}</div>
                  )}
                  {t.subcategory && (
                    <div className="text-blue-600 text-xs mt-1">
                      📌 {t.subcategory}
                    </div>
                  )}
                </div>
              ))}
              {savingsTooltip.transactions.length > 8 && (
                <div className="text-center text-gray-500 text-xs pt-2">
                  ... et {savingsTooltip.transactions.length - 8} autre(s) transaction(s)
                </div>
              )}
            </div>
            <div className="mt-3 pt-3 border-t">
              <div className="flex items-center justify-between font-bold">
                <span>Total:</span>
                <span className="text-blue-700">
                  {savingsTooltip.transactions.reduce((sum, t) => sum + t.amount, 0).toFixed(2)} $
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
