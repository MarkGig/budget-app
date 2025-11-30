import React from 'react'

interface NavBarProps {
  onNavigate: (page: 'home' | 'budget' | 'categories' | 'investments' | 'reports' | 'information' | 'liabilities') => void
  currentPage: 'home' | 'budget' | 'categories' | 'investments' | 'reports' | 'information' | 'liabilities'
}

export default function NavBar({ onNavigate, currentPage }: NavBarProps) {
  return (
    <nav className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-8">
            <h1 className="text-2xl font-bold cursor-pointer" onClick={() => onNavigate('home')}>
              💰 Budget App
            </h1>
            <div className="flex gap-6">
              <button
                onClick={() => onNavigate('home')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'home'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Accueil
              </button>
              <button
                onClick={() => onNavigate('budget')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'budget'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Budget
              </button>
              <button
                onClick={() => onNavigate('investments')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'investments'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Placements
              </button>
              <button
                onClick={() => onNavigate('reports')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'reports'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Sommaire
              </button>
              <button
                onClick={() => onNavigate('liabilities')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'liabilities'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Passifs
              </button>
              <button
                onClick={() => onNavigate('information')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'information'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Mes comptes
              </button>
              <button
                onClick={() => onNavigate('categories')}
                className={`px-4 py-2 rounded-md font-medium transition ${
                  currentPage === 'categories'
                    ? 'bg-blue-500 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                Personnalisation
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
