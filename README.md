# Budget Web App

Projet minimal Vite + React + TypeScript pour une application de budget personnel.

Caractéristiques:
- Stockage local robuste via IndexedDB (bibliothèque `idb`) pour gérer de nombreuses transactions.
- UI simple: ajout de transaction, affichage paginé (100 par page) et chargement "Charger plus".

Installer et lancer:

```bash
cd "${PWD:-.}/Budget App GIT/budget-web-app"
npm install
npm run dev
```

Ensuite ouvrir `http://localhost:5173`.

Prochaines améliorations possibles:
- Pagination infinie / virtualisation pour très grandes listes
- Filtres par date, catégories
- Export CSV / sauvegarde cloud
