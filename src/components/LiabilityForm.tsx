const PERIODICITIES = [
  'Mensuel',
  'Bi-mensuel',
  'Aux deux semaines',
];
import React, { useState } from 'react';
import { Account } from '../db';

interface LiabilityFormProps {
  type: string;
  initial?: Partial<Account>;
  onSave: (data: Partial<Account>) => void;
  onCancel: () => void;
}

const LABELS: Record<string, string> = {
  'Carte de crédit': 'Carte de crédit',
  'Prêt': 'Prêt',
  'Marge de crédit': 'Marge de crédit',
  'Marge de crédit hypothécaire': 'Marge de crédit hypothécaire',
  'Hypothèque': 'Prêt hypothécaire',
};

export default function LiabilityForm({ type, initial = {}, onSave, onCancel }: LiabilityFormProps) {
  const [name, setName] = useState(initial.name || '');
  const [balance, setBalance] = useState<number>(initial.balance || 0);
  const [limit, setLimit] = useState((initial as any).limit || '');
  const [minPayment, setMinPayment] = useState((initial as any).minPayment || '');
  const [rate, setRate] = useState((initial as any).rate || '');
  const [monthlyPayment, setMonthlyPayment] = useState((initial as any).monthlyPayment || '');
  const [endDate, setEndDate] = useState((initial as any).endDate || '');
  const [amortization, setAmortization] = useState((initial as any).amortization || '');
  const [payment, setPayment] = useState((initial as any).payment || '');
  const [periodicity, setPeriodicity] = useState((initial as any).periodicity || '');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const data: any = {
      name,
      type,
      balance: Number(balance),
    };
    // Preserve id when editing so parent can update instead of creating new
    if ((initial as any).id) {
      data.id = (initial as any).id;
    }
    if (type === 'Carte de crédit' || type === 'Marge de crédit' || type === 'Marge de crédit hypothécaire') {
      data.limit = limit;
      data.rate = rate;
      if (type === 'Carte de crédit') data.minPayment = minPayment;
    }
    if (type === 'Prêt') {
      data.monthlyPayment = monthlyPayment;
      data.rate = rate;
      data.endDate = endDate;
      data.periodicity = periodicity;
    }
    if (type === 'Hypothèque') {
      data.amortization = amortization;
      data.payment = payment;
      data.rate = rate;
    }
    onSave(data);
  }

  return (
    <form className="bg-white p-4 rounded shadow-md mb-4" onSubmit={handleSubmit}>
      <h3 className="text-lg font-semibold mb-2">{initial && initial.id ? 'Modifier' : 'Ajouter'} {LABELS[type] || type}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Nom</label>
          <input className="w-full border rounded px-2 py-1" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Solde</label>
          <input className="w-full border rounded px-2 py-1" type="number" value={balance} onChange={e => setBalance(Number(e.target.value))} required />
        </div>
        {(type === 'Carte de crédit' || type === 'Marge de crédit' || type === 'Marge de crédit hypothécaire') && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Limite</label>
              <input className="w-full border rounded px-2 py-1" type="number" value={limit} onChange={e => setLimit(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taux d'intérêt (%)</label>
              <input className="w-full border rounded px-2 py-1" type="number" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
          </>
        )}
        {type === 'Carte de crédit' && (
          <div>
            <label className="block text-sm font-medium mb-1">Paiement minimum</label>
            <input className="w-full border rounded px-2 py-1" type="number" value={minPayment} onChange={e => setMinPayment(e.target.value)} />
          </div>
        )}
        {type === 'Prêt' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Paiement</label>
              <input className="w-full border rounded px-2 py-1" type="number" value={monthlyPayment} onChange={e => setMonthlyPayment(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taux (%)</label>
              <input className="w-full border rounded px-2 py-1" type="number" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Date de fin</label>
              <input className="w-full border rounded px-2 py-1" type="date" value={endDate} onChange={e => setEndDate(e.target.value)} min="1900-01-01" max="2099-12-31" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Périodicité</label>
              <select className="w-full border rounded px-2 py-1" value={periodicity || ''} onChange={e => setPeriodicity(e.target.value)} required>
                <option value="">Choisir...</option>
                {PERIODICITIES.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </>
        )}
        {type === 'Hypothèque' && (
          <>
            <div>
              <label className="block text-sm font-medium mb-1">Amortissement restant</label>
              <input className="w-full border rounded px-2 py-1" value={amortization} onChange={e => setAmortization(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Paiement</label>
              <input className="w-full border rounded px-2 py-1" type="number" value={payment} onChange={e => setPayment(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Taux (%)</label>
              <input className="w-full border rounded px-2 py-1" type="number" value={rate} onChange={e => setRate(e.target.value)} />
            </div>
          </>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Enregistrer</button>
        <button type="button" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={onCancel}>Annuler</button>
      </div>
    </form>
  );
}
