import React, { useState } from 'react'

interface Investment {
  id: number
  name: string
  type: 'action' | 'fonds' | 'obligation' | 'crypto' | 'immobilier'
  description: string
  risk: 'faible' | 'moyen' | 'élevé'
  rendement: string
  frais: string
}

const INVESTMENTS: Investment[] = [
  {
    id: 1,
    name: 'Actions (Stocks)',
    type: 'action',
    description: 'Achat de parts de propriété dans des entreprises. Potentiel de rendement élevé mais volatilité importante.',
    risk: 'élevé',
    rendement: '7-10% annuel historique',
    frais: '0.1-0.5% par transaction'
  },
  {
    id: 2,
    name: 'Fonds Mutuels',
    type: 'fonds',
    description: 'Portefeuille géré par des professionnels composé d\'actions, obligations et autres titres.',
    risk: 'moyen',
    rendement: '5-8% annuel',
    frais: '0.5-2% annuel (ratio de dépenses)'
  },
  {
    id: 3,
    name: 'Fonds Indiciels (ETF)',
    type: 'fonds',
    description: 'Fonds passifs suivant un indice (S&P 500, TSX). Frais plus bas que les fonds mutuels.',
    risk: 'moyen',
    rendement: '5-10% annuel',
    frais: '0.03-0.2% annuel'
  },
  {
    id: 4,
    name: 'Obligations',
    type: 'obligation',
    description: 'Prêts aux gouvernements ou entreprises. Rendement stable et prévisible.',
    risk: 'faible',
    rendement: '3-5% annuel',
    frais: '0.1-0.5% par transaction'
  },
  {
    id: 5,
    name: 'Certificats de Placement Garanti (CPG)',
    type: 'obligation',
    description: 'Produit d\'épargne garanti par les banques avec rendement fixe et capital protégé.',
    risk: 'faible',
    rendement: '4-5% annuel',
    frais: 'Aucun (généralement)'
  },
  {
    id: 6,
    name: 'Comptes REER',
    type: 'fonds',
    description: 'Compte d\'épargne-retraite avec avantages fiscaux au Canada. Peut contenir actions, obligations, fonds.',
    risk: 'moyen',
    rendement: 'Dépend de contenu',
    frais: '0.2-2% selon investissements'
  },
  {
    id: 7,
    name: 'Comptes TFSA',
    type: 'fonds',
    description: 'Compte d\'épargne libre d\'impôt au Canada. Croissance et retraits non imposables.',
    risk: 'moyen',
    rendement: 'Dépend de contenu',
    frais: '0.2-2% selon investissements'
  },
  {
    id: 8,
    name: 'Crypto-monnaies',
    type: 'crypto',
    description: 'Bitcoin, Ethereum et autres. Très volatiles mais potentiel de croissance exponentielle.',
    risk: 'élevé',
    rendement: 'Extrêmement variable',
    frais: '0.1-1% par transaction'
  },
  {
    id: 9,
    name: 'Immobilier',
    type: 'immobilier',
    description: 'Investissement direct dans propriétés ou REIT (fiducie immobilière).',
    risk: 'moyen',
    rendement: '5-8% annuel + appréciation',
    frais: 'Variable (hypothèque, taxes, maintenance)'
  },
  {
    id: 10,
    name: 'Dividendes',
    type: 'action',
    description: 'Actions ou fonds qui versent des dividendes réguliers. Revenu passif stable.',
    risk: 'moyen',
    rendement: '2-6% en dividendes',
    frais: 'Dépend du placement'
  }
]

export default function InvestmentsPage({ onClose }: { onClose: () => void }) {
  const [selectedType, setSelectedType] = useState<'tous' | 'action' | 'fonds' | 'obligation' | 'crypto' | 'immobilier'>('tous')

  const filtered = selectedType === 'tous' ? INVESTMENTS : INVESTMENTS.filter(inv => inv.type === selectedType)

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'faible': return 'bg-green-100 text-green-800'
      case 'moyen': return 'bg-yellow-100 text-yellow-800'
      case 'élevé': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100'
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Guide des Placements</h1>
        <button className="px-4 py-2 text-sm border rounded hover:bg-gray-100" onClick={onClose}>Retour</button>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Principes d'investissement</h2>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• <strong>Diversification:</strong> Ne pas mettre tous les œufs dans le même panier</li>
          <li>• <strong>Horizon temporel:</strong> Plus l'horizon est long, plus on peut prendre de risques</li>
          <li>• <strong>Coûts:</strong> Minimiser les frais pour maximiser les rendements</li>
          <li>• <strong>Réequilibrage:</strong> Réviser son portefeuille régulièrement</li>
        </ul>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${selectedType === 'tous' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedType('tous')}
        >
          Tous
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${selectedType === 'action' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedType('action')}
        >
          Actions
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${selectedType === 'fonds' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedType('fonds')}
        >
          Fonds
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${selectedType === 'obligation' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedType('obligation')}
        >
          Obligations
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${selectedType === 'crypto' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedType('crypto')}
        >
          Crypto
        </button>
        <button
          className={`px-4 py-2 rounded text-sm font-medium ${selectedType === 'immobilier' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          onClick={() => setSelectedType('immobilier')}
        >
          Immobilier
        </button>
      </div>

      <div className="grid gap-4">
        {filtered.map(investment => (
          <div key={investment.id} className="card p-5 border border-gray-200 rounded-lg hover:shadow-lg transition">
            <div className="flex items-start justify-between mb-3">
              <h3 className="text-lg font-semibold">{investment.name}</h3>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRiskColor(investment.risk)}`}>
                Risque: {investment.risk.charAt(0).toUpperCase() + investment.risk.slice(1)}
              </span>
            </div>

            <p className="text-gray-700 mb-3">{investment.description}</p>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="bg-green-50 p-3 rounded">
                <p className="text-gray-600 font-medium">Rendement moyen</p>
                <p className="text-green-700 font-semibold">{investment.rendement}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded">
                <p className="text-gray-600 font-medium">Frais typiques</p>
                <p className="text-orange-700 font-semibold">{investment.frais}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded">
        <h3 className="font-semibold mb-2">Conseil</h3>
        <p className="text-sm text-gray-700">
          Pour un portefeuille équilibré, considérez la règle 80/20 ou 70/30: 80-70% en obligations/fonds sûrs + 20-30% en actions pour la croissance. Ajustez selon votre tolérance au risque et horizon d'investissement.
        </p>
      </div>
    </div>
  )
}
