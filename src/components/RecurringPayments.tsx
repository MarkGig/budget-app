import React, { useEffect, useState } from 'react';

const STORAGE_KEY = 'recurringPayments_v2';

export type RecurringFrequency = 'Mensuel' | 'Hebdomadaire' | 'Annuel' | 'Bi-mensuel' | 'Aux deux semaines';

interface Recurring {
  id: number;
  name: string;
  amount: number;
  frequency: RecurringFrequency;
  date: string; // ISO string
}

const RecurringPayments: React.FC = () => {
  const [recurrings, setRecurrings] = useState<Recurring[]>([]);
  const [newName, setNewName] = useState('');
  const [newAmount, setNewAmount] = useState('');
  const [newFreq, setNewFreq] = useState<RecurringFrequency>('Mensuel');
  const [newDate, setNewDate] = useState('');

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        setRecurrings(JSON.parse(raw));
      } catch (e) {
        setRecurrings([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recurrings));
  }, [recurrings]);

  function addRecurring(e?: React.FormEvent) {
    e?.preventDefault();
    const amt = parseFloat(newAmount || '0');
    if (!newName.trim() || Number.isNaN(amt) || !newDate) return;
    const id = Date.now();
    setRecurrings((s) => [
      ...s,
      { id, name: newName.trim(), amount: amt, frequency: newFreq, date: newDate },
    ]);
    setNewName('');
    setNewAmount('');
    setNewDate('');
  }

  function removeRecurring(id: number) {
    setRecurrings((s) => s.filter((r) => r.id !== id));
  }

  return (
    <div className="card p-4 mt-4">
      <h2 className="text-lg font-semibold mb-3">Paiements récurrents</h2>
      <form onSubmit={addRecurring} className="flex flex-wrap gap-2 mb-3 items-end">
        <input className="flex-1 p-2 border rounded" placeholder="Nom (ex: Hydro)" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <input className="w-32 p-2 border rounded" placeholder="Montant" value={newAmount} onChange={(e) => setNewAmount(e.target.value)} />
        <select className="p-2 border rounded" value={newFreq} onChange={(e) => setNewFreq(e.target.value as RecurringFrequency)}>
          <option>Mensuel</option>
          <option>Hebdomadaire</option>
          <option>Annuel</option>
          <option>Bi-mensuel</option>
          <option>Aux deux semaines</option>
        </select>
        <input type="date" className="p-2 border rounded" value={newDate} onChange={e => setNewDate(e.target.value)} min="1900-01-01" max="2099-12-31" />
        <button className="px-3 py-1 bg-blue-600 text-white rounded" type="submit">Ajouter</button>
      </form>
      <div className="space-y-2">
        {recurrings.map(r => (
          <div key={r.id} className="flex items-center justify-between">
            <div>
              <div className="font-medium">{r.name}</div>
              <div className="text-sm text-gray-500">{r.frequency} - {r.amount.toFixed(2)}$ - {r.date}</div>
            </div>
            <button type="button" className="text-red-600 text-sm" onClick={() => removeRecurring(r.id)}>Supprimer</button>
          </div>
        ))}
        {recurrings.length === 0 && <div className="text-gray-500">Aucun paiement récurrent</div>}
      </div>
    </div>
  );
};

export default RecurringPayments;
