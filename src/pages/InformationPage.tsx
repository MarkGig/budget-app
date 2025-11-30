import React, { useEffect, useState } from 'react';
import { Account, addAccount, deleteAccount, getAccounts } from '../db';
import { AccountType } from '../types';

const accountTypes = [
  'Chèque',
  'Épargne',
  'CELI',
  'CELIAPP',
  'REER',
  'Marge de crédit',
  'Marge de crédit hypothécaire',
  'Prêt',
  'Carte de crédit',
  'Fonds de travailleurs',
  'Placements',
  'Hypothèque',
] as const;

const InformationPage: React.FC = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [newAccount, setNewAccount] = useState({ name: '', type: accountTypes[0] as string, balance: 0 });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editAccount, setEditAccount] = useState<{ name: string; type: Account['type']; balance: number } | null>(null);

  const formatAmount = (amount: number): string => {
    return amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  };

  useEffect(() => {
    async function fetchAccounts() {
      const storedAccounts = await getAccounts();
      setAccounts(storedAccounts);
    }
    fetchAccounts();
  }, []);

  const handleAddAccount = async () => {
    console.log('Adding account:', newAccount); // Log the account being added
    if (newAccount.name.trim() === '') {
      console.error('Account name is empty');
      return;
    }
    try {
      const id = await addAccount({
        name: newAccount.name,
        type: newAccount.type as Account['type'],
        balance: newAccount.balance,
      });
      console.log('Account added with ID:', id);
      setAccounts((prev) => [
        ...prev,
        { id, name: newAccount.name, type: newAccount.type as Account['type'], balance: newAccount.balance },
      ]);
      setNewAccount({ name: '', type: accountTypes[0], balance: 0 });
    } catch (error) {
      console.error('Error adding account:', error);
    }
  };

  const handleRemoveAccount = async (id: number) => {
    await deleteAccount(id);
    setAccounts((prev) => prev.filter((account) => account.id !== id));
  };

  const startEdit = (account: Account) => {
    setEditingId(account.id!);
    setEditAccount({ name: account.name, type: account.type, balance: account.balance });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditAccount(null);
  };

  const handleEditAccount = async (id: number) => {
    if (!editAccount) return;
    // Remove then add to update (since no updateAccount in db.ts)
    await deleteAccount(id);
    const newId = await addAccount({ ...editAccount });
    setAccounts((prev) => prev.map(acc => acc.id === id ? { ...editAccount, id: newId } : acc));
    setEditingId(null);
    setEditAccount(null);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Gestion des Comptes</h1>
      </div>

      {/* Formulaire d'ajout */}
      <div className="card p-6 mb-8 bg-gradient-to-r from-blue-50 to-indigo-50">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">➕ Ajouter un nouveau compte</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Nom du compte"
            value={newAccount.name}
            onChange={(e) => setNewAccount({ ...newAccount, name: e.target.value })}
            className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <select
            value={newAccount.type}
            onChange={(e) => setNewAccount({ ...newAccount, type: e.target.value })}
            className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {accountTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Solde initial"
            value={newAccount.balance}
            onChange={(e) => {
              let value = parseFloat(e.target.value) || 0;
              setNewAccount({ ...newAccount, balance: value });
            }}
            className="border p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <button 
          onClick={handleAddAccount} 
          className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors w-full md:w-auto"
        >
          Ajouter le compte
        </button>
      </div>

      {/* Groupement par type */}
      {(() => {
        const liabilityTypes = ['Carte de crédit', 'Marge de crédit', 'Marge de crédit hypothécaire', 'Prêt', 'Hypothèque'];
        const isLiability = (type: string) => liabilityTypes.includes(type);
        
        const grouped = {
          '💰 Comptes bancaires': accounts.filter(a => ['Chèque', 'Épargne'].includes(a.type)),
          '📈 Épargnes et placements': accounts.filter(a => ['CELI', 'CELIAPP', 'REER', 'Fonds de travailleurs', 'Placements'].includes(a.type)),
          '💳 Cartes et marges de crédit': accounts.filter(a => ['Carte de crédit', 'Marge de crédit', 'Marge de crédit hypothécaire'].includes(a.type)),
          '🏠 Prêts et hypothèques': accounts.filter(a => ['Prêt', 'Hypothèque'].includes(a.type)),
        };

        return (
          <div className="space-y-6">
            {Object.entries(grouped).map(([groupName, groupAccounts]) => {
              if (groupAccounts.length === 0) return null;
              
              const groupIsLiability = groupAccounts.length > 0 && isLiability(groupAccounts[0].type);
              
              // Pour les passifs: additionner seulement les dettes (valeurs positives)
              // Pour les actifs: additionner normalement
              const totalBalance = groupIsLiability 
                ? groupAccounts.reduce((sum, acc) => sum + (acc.balance > 0 ? acc.balance : 0), 0)
                : groupAccounts.reduce((sum, acc) => sum + acc.balance, 0);
              
              // Pour les passifs: toujours rouge si > 0
              // Pour les actifs: rouge si négatif, vert si positif
              const isNegative = groupIsLiability ? totalBalance > 0 : totalBalance < 0;
              
              return (
                <div key={groupName} className="card p-0 overflow-hidden">
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 p-4 border-b flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-800">{groupName}</h2>
                    <div className="text-right">
                      <div className="text-sm text-gray-600">Total du groupe</div>
                      <div className={`text-2xl font-bold ${isNegative ? 'text-red-600' : 'text-green-600'}`}>
                        {formatAmount(totalBalance)} $
                      </div>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {groupAccounts.map((account) => (
                        <div 
                          key={account.id} 
                          className="border-2 border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow bg-white"
                        >
                          {editingId === account.id ? (
                            <div className="flex flex-col gap-3">
                              <input
                                type="text"
                                value={editAccount?.name || ''}
                                onChange={e => setEditAccount(editAccount ? { ...editAccount, name: e.target.value } : null)}
                                className="border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="Nom"
                              />
                              <select
                                value={editAccount?.type}
                                onChange={e => setEditAccount(editAccount ? { ...editAccount, type: e.target.value as Account['type'] } : null)}
                                className="border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                              >
                                {accountTypes.map((type) => (
                                  <option key={type} value={type}>{type}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                value={editAccount?.balance || 0}
                                onChange={e => setEditAccount(editAccount ? { ...editAccount, balance: parseFloat(e.target.value) || 0 } : null)}
                                className="border p-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                                placeholder="Solde"
                              />
                              <div className="flex gap-2 mt-2">
                                <button 
                                  onClick={() => handleEditAccount(account.id!)} 
                                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  ✓ Sauvegarder
                                </button>
                                <button 
                                  onClick={cancelEdit} 
                                  className="flex-1 bg-gray-400 hover:bg-gray-500 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  ✕ Annuler
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="mb-3">
                                <h3 className="font-bold text-lg text-gray-800 mb-1">{account.name}</h3>
                                <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                                  {account.type}
                                </span>
                              </div>
                              <div className="mb-4">
                                <div className="text-sm text-gray-600 mb-1">Solde actuel</div>
                                <div className={`text-2xl font-bold ${
                                  isLiability(account.type) 
                                    ? (account.balance > 0 ? 'text-red-600' : account.balance < 0 ? 'text-green-600' : 'text-gray-600')
                                    : (account.balance < 0 ? 'text-red-600' : account.balance > 0 ? 'text-green-600' : 'text-gray-600')
                                }`}>
                                  {formatAmount(account.balance)} $
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => startEdit(account)}
                                  className="flex-1 bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  ✏️ Modifier
                                </button>
                                <button
                                  onClick={() => handleRemoveAccount(account.id!)}
                                  className="flex-1 bg-red-100 hover:bg-red-200 text-red-700 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                >
                                  🗑️ Supprimer
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        );
      })()}

      {accounts.length === 0 && (
        <div className="card p-12 text-center">
          <div className="text-6xl mb-4">💼</div>
          <p className="text-xl text-gray-600 mb-2">Aucun compte ajouté</p>
          <p className="text-sm text-gray-500">Commencez par ajouter un compte ci-dessus</p>
        </div>
      )}
    </div>
  );
};

export default InformationPage;