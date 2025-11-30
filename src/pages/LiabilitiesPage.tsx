// (supprimé, sera redéfini dans le composant)
import React, { useEffect, useState } from 'react';
import { getAccounts, addAccount, updateAccount, Account } from '../db';
import { deleteAccount } from '../db';
import LiabilityForm from '../components/LiabilityForm';
import { formatAmount } from '../utils/formatters';

const CREDIT_TYPES = [
  'Carte de crédit',
  'Marge de crédit',
  'Prêt',
  'Prêt auto',
  'Prêt étudiant',
  'Prêt personnel',
  'Marge de crédit hypothécaire',
  'Hypothèque',
];

function isCreditAccount(type: string) {
  return CREDIT_TYPES.some(t => type.toLowerCase().includes(t.toLowerCase()));
}


export default function LiabilitiesPage({ onClose }: { onClose: () => void }) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [form, setForm] = useState<{ type: string; initial?: Partial<Account> } | null>(null);

  function refresh() {
    getAccounts().then(setAccounts);
  }

  async function handleDelete(acc: Account) {
    if (window.confirm('Supprimer ce passif ?')) {
      if (acc.id) {
        await deleteAccount(acc.id);
        refresh();
      }
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleSave(data: Partial<Account>) {
    if (data.id) {
      await updateAccount(data as Account);
    } else {
      await addAccount(data as Omit<Account, 'id'>);
    }
    setForm(null);
    refresh();
  }

  // Group accounts by type for display
  const grouped = {
    'Cartes de crédit': accounts.filter(a => a.type === 'Carte de crédit'),
    'Prêts': accounts.filter(a => a.type === 'Prêt'),
    'Marges de crédit': accounts.filter(a => a.type === 'Marge de crédit'),
    'Marge de crédit hypothécaire': accounts.filter(a => a.type === 'Marge de crédit hypothécaire'),
    'Prêt hypothécaire': accounts.filter(a => a.type === 'Hypothèque'),
    'Location auto': accounts.filter(a => a.type === 'Location auto'),
  };
  

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Passifs et Dettes</h1>
        <button
          className="px-4 py-2 text-sm border rounded hover:bg-gray-100"
          onClick={() => onClose()}
        >
          Retour
        </button>
      </div>

      {/* Fonction helper pour déterminer la couleur selon le taux d'utilisation */}
      {(() => {
        const getUtilizationColor = (balance: number, limit: number) => {
          if (!limit || limit === 0) return '';
          const ratio = (balance / limit) * 100;
          if (ratio <= 30) return 'bg-green-100 text-green-800';
          if (ratio <= 50) return 'bg-yellow-100 text-yellow-800';
          if (ratio <= 70) return 'bg-orange-100 text-orange-800';
          return 'bg-red-100 text-red-800';
        };
        
        // Store the function in component scope
        (window as any).__getUtilizationColor = getUtilizationColor;
        return null;
      })()}

      {/* Formulaire d'ajout/modification de passif (toujours visible en haut si ouvert) */}
      {form && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded shadow-lg p-0 w-full max-w-lg mx-2 relative">
            <button
              className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl font-bold"
              onClick={() => setForm(null)}
              aria-label="Fermer"
            >
              ×
            </button>
            <LiabilityForm
              type={form.type}
              initial={form.initial}
              onSave={handleSave}
              onCancel={() => setForm(null)}
            />
          </div>
        </div>
      )}

      {/* Cartes de crédit */}
      <section className="mb-8">
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-semibold">Cartes de crédit</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setForm({ type: 'Carte de crédit' })}>Ajouter</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Solde actuel</th>
                <th className="px-4 py-2 text-right">Limite</th>
                <th className="px-4 py-2 text-right">Paiement minimum</th>
                <th className="px-4 py-2 text-right">Taux d'intérêt</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped['Cartes de crédit'].length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-4">Aucune carte de crédit</td></tr>
              ) : grouped['Cartes de crédit'].map(acc => {
                const limit = (acc as any).limit || 0;
                const utilizationColor = limit > 0 ? (window as any).__getUtilizationColor(acc.balance || 0, limit) : '';
                return (
                <tr key={acc.id} className="border-b">
                  <td className="px-4 py-2">{acc.name}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${utilizationColor} rounded`}>{formatAmount(acc.balance || 0)}$</td>
                  <td className="px-4 py-2 text-right">{limit ? `${limit}$` : '-'}</td>
                  <td className="px-4 py-2 text-right">{typeof acc.balance === 'number' ? `${(acc.balance * 0.05).toFixed(2)}$` : ((acc as any).minPayment ? `${(acc as any).minPayment}$` : '-')}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).rate ? `${(acc as any).rate}%` : '-'}</td>
                  <td className="px-4 py-2 text-right flex gap-2 justify-end">
                    <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" onClick={() => setForm({ type: 'Carte de crédit', initial: acc })}>Modifier</button>
                    <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" onClick={() => handleDelete(acc)}>Supprimer</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* Prêts personnels / Location auto / autres */}
      <section className="mb-8">
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-semibold">Prêts personnels / Location auto / autres</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setForm({ type: 'Prêt' })}>Ajouter</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Capital restant</th>
                <th className="px-4 py-2 text-right">Paiement</th>
                <th className="px-4 py-2 text-right">Périodicité</th>
                <th className="px-4 py-2 text-right">Taux</th>
                <th className="px-4 py-2 text-right">Date de fin</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped['Prêts'].length === 0 ? (
                <tr><td colSpan={7} className="text-center text-gray-400 py-4">Aucun prêt</td></tr>
              ) : grouped['Prêts'].map(acc => (
                <tr key={acc.id} className="border-b">
                  <td className="px-4 py-2">{acc.name}</td>
                  <td className="px-4 py-2 text-right">{formatAmount(acc.balance || 0)}$</td>
                  <td className="px-4 py-2 text-right">{(acc as any).monthlyPayment ? `${(acc as any).monthlyPayment}$` : '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).periodicity || '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).rate ? `${(acc as any).rate}%` : '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).endDate || '-'}</td>
                  <td className="px-4 py-2 text-right flex gap-2 justify-end">
                    <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" onClick={() => setForm({ type: 'Prêt', initial: acc })}>Modifier</button>
                    <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" onClick={() => handleDelete(acc)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* Marges de crédit */}
      <section className="mb-8">
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-semibold">Marges de crédit</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setForm({ type: 'Marge de crédit' })}>Ajouter</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Solde</th>
                <th className="px-4 py-2 text-right">Limite</th>
                <th className="px-4 py-2 text-right">Taux variable</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped['Marges de crédit'].length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-4">Aucune marge de crédit</td></tr>
              ) : grouped['Marges de crédit'].map(acc => {
                const limit = (acc as any).limit || 0;
                const utilizationColor = limit > 0 ? (window as any).__getUtilizationColor(acc.balance || 0, limit) : '';
                return (
                <tr key={acc.id} className="border-b">
                  <td className="px-4 py-2">{acc.name}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${utilizationColor} rounded`}>{formatAmount(acc.balance || 0)}$</td>
                  <td className="px-4 py-2 text-right">{limit ? `${limit}$` : '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).rate ? `${(acc as any).rate}%` : '-'}</td>
                  <td className="px-4 py-2 text-right flex gap-2 justify-end">
                    <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" onClick={() => setForm({ type: 'Marge de crédit', initial: acc })}>Modifier</button>
                    <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" onClick={() => handleDelete(acc)}>Supprimer</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* Marge de crédit hypothécaire */}
      <section className="mb-8">
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-semibold">Marge de crédit hypothécaire</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setForm({ type: 'Marge de crédit hypothécaire' })}>Ajouter</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Solde</th>
                <th className="px-4 py-2 text-right">Limite</th>
                <th className="px-4 py-2 text-right">Taux variable</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped['Marge de crédit hypothécaire'].length === 0 ? (
                <tr><td colSpan={5} className="text-center text-gray-400 py-4">Aucune marge de crédit hypothécaire</td></tr>
              ) : grouped['Marge de crédit hypothécaire'].map(acc => {
                const limit = (acc as any).limit || 0;
                const utilizationColor = limit > 0 ? (window as any).__getUtilizationColor(acc.balance || 0, limit) : '';
                return (
                <tr key={acc.id} className="border-b">
                  <td className="px-4 py-2">{acc.name}</td>
                  <td className={`px-4 py-2 text-right font-semibold ${utilizationColor} rounded`}>{formatAmount(acc.balance || 0)}$</td>
                  <td className="px-4 py-2 text-right">{limit ? `${limit}$` : '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).rate ? `${(acc as any).rate}%` : '-'}</td>
                  <td className="px-4 py-2 text-right flex gap-2 justify-end">
                    <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" onClick={() => setForm({ type: 'Marge de crédit hypothécaire', initial: acc })}>Modifier</button>
                    <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" onClick={() => handleDelete(acc)}>Supprimer</button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </section>

      {/* Prêt hypothécaire */}
      <section className="mb-8">
        <div className="bg-white border rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-4 border-b pb-3">
            <h2 className="text-xl font-semibold">Prêt hypothécaire</h2>
            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700" onClick={() => setForm({ type: 'Hypothèque' })}>Ajouter</button>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-right">Solde</th>
                <th className="px-4 py-2 text-right">Amortissement restant</th>
                <th className="px-4 py-2 text-right">Paiement</th>
                <th className="px-4 py-2 text-right">Taux</th>
                <th className="px-4 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {grouped['Prêt hypothécaire'].length === 0 ? (
                <tr><td colSpan={6} className="text-center text-gray-400 py-4">Aucun prêt hypothécaire</td></tr>
              ) : grouped['Prêt hypothécaire'].map(acc => (
                <tr key={acc.id} className="border-b">
                  <td className="px-4 py-2">{acc.name}</td>
                  <td className="px-4 py-2 text-right">{formatAmount(acc.balance || 0)}$</td>
                  <td className="px-4 py-2 text-right">{(acc as any).amortization || '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).payment ? `${(acc as any).payment}$` : '-'}</td>
                  <td className="px-4 py-2 text-right">{(acc as any).rate ? `${(acc as any).rate}%` : '-'}</td>
                  <td className="px-4 py-2 text-right flex gap-2 justify-end">
                    <button className="px-2 py-1 text-xs bg-gray-100 rounded hover:bg-gray-200" onClick={() => setForm({ type: 'Hypothèque', initial: acc })}>Modifier</button>
                    <button className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200" onClick={() => handleDelete(acc)}>Supprimer</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </section>

  </div>
  );
}
