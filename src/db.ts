// Mettre à jour un compte par son ID
export async function updateAccount(account: Account) {
  if (!account.id) throw new Error('Account id is required');
  const db = await getDB();
  return db.put(ACCOUNTS_STORE, account);
}
// Mettre à jour une transaction par son ID
export async function updateTransaction(newTx: Transaction) {
  if (!newTx.id) throw new Error('Transaction id is required');
  const db = await getDB();
  
  // Récupérer l'ancienne transaction pour ajuster les soldes
  const oldTx = await db.get(TRANSACTIONS_STORE, newTx.id);
  
  // Annuler l'effet de l'ancienne transaction
  if (oldTx && oldTx.accountId) {
    const account = await db.get(ACCOUNTS_STORE, oldTx.accountId);
    if (account) {
      if (oldTx.type === 'expense' || oldTx.type === 'savings') {
        account.balance += oldTx.amount; // Remettre le montant
      } else if (oldTx.type === 'income') {
        account.balance -= oldTx.amount;
      }
      await db.put(ACCOUNTS_STORE, account);
    }
  }
  
  // Appliquer la nouvelle transaction
  if (newTx.accountId) {
    const account = await db.get(ACCOUNTS_STORE, newTx.accountId);
    if (account) {
      if (newTx.type === 'expense' || newTx.type === 'savings') {
        account.balance -= newTx.amount;
      } else if (newTx.type === 'income') {
        account.balance += newTx.amount;
      }
      await db.put(ACCOUNTS_STORE, account);
    }
  }
  
  return db.put(TRANSACTIONS_STORE, newTx);
}
// Supprimer une transaction par son ID
export async function deleteTransaction(id: number) {
  const db = await getDB();
  
  // Récupérer la transaction pour ajuster le solde du compte
  const tx = await db.get(TRANSACTIONS_STORE, id);
  if (tx && tx.accountId) {
    const account = await db.get(ACCOUNTS_STORE, tx.accountId);
    if (account) {
      // Inverser l'effet de la transaction
      if (tx.type === 'expense' || tx.type === 'savings') {
        account.balance += tx.amount; // Remettre le montant
      } else if (tx.type === 'income') {
        account.balance -= tx.amount;
      }
      await db.put(ACCOUNTS_STORE, account);
    }
  }
  
  return db.delete(TRANSACTIONS_STORE, id);
}
import { openDB } from 'idb'

export type ExpenseCategory = 'Transport' | 'Loisir' | 'Maison' | 'Épicerie' | 'Autre' | string
export type IncomeCategory = 'Salaire' | 'Dividende' | 'Autre' | string
export type Category = ExpenseCategory | IncomeCategory
export type MaisonSubcategory = 'Assurance' | 'Hypothèque' | 'Rénovations'
export type VoitureSubcategory = 'Essence' | 'Réparation' | 'Assurance' | 'Autres'
export type Periodicity = 'Aucune' | 'Hebdomadaire' | 'Aux 2 semaines' | 'Bi-mensuel' | 'Mensuel' | 'Annuel'

export interface Transaction {
  id?: number
  description: string
  amount: number
  type: 'income' | 'expense' | 'savings'
  category: Category
  // subcategory is a free-form string to support dynamic subcategories
  subcategory?: string
  periodicity: Periodicity
  date: string
  accountId?: number // ID du compte source (optionnel)
}

const DB_NAME = 'budget-db'
const TRANSACTIONS_STORE = 'transactions'
const CATEGORIES_STORE = 'categories'
const ACCOUNTS_STORE = 'accounts'
const GOALS_STORE = 'goals'
const DB_VERSION = 6 // Added accountId to transactions

async function getDB() {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (!db.objectStoreNames.contains(TRANSACTIONS_STORE)) {
        db.createObjectStore(TRANSACTIONS_STORE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(CATEGORIES_STORE)) {
        db.createObjectStore(CATEGORIES_STORE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains('subcategories')) {
        db.createObjectStore('subcategories', { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(ACCOUNTS_STORE)) {
        db.createObjectStore(ACCOUNTS_STORE, { keyPath: 'id', autoIncrement: true })
      }
      if (!db.objectStoreNames.contains(GOALS_STORE)) {
        db.createObjectStore(GOALS_STORE, { keyPath: 'id', autoIncrement: true })
      }
    }
  })
}

export async function addTransaction(tx: Omit<Transaction, 'id'>) {
  const db = await getDB()
  const id = await db.add(TRANSACTIONS_STORE, tx)
  
  // Mettre à jour le solde du compte si accountId est spécifié
  if (tx.accountId) {
    const account = await db.get(ACCOUNTS_STORE, tx.accountId)
    if (account) {
      // Pour les dépenses: diminuer le solde (ou augmenter la dette)
      // Pour les revenus: augmenter le solde (ou diminuer la dette)
      // Pour les épargnes: diminuer le solde du compte source
      if (tx.type === 'expense' || tx.type === 'savings') {
        account.balance -= tx.amount
      } else if (tx.type === 'income') {
        account.balance += tx.amount
      }
      await db.put(ACCOUNTS_STORE, account)
    }
  }
  
  return id
}

// Get transactions with offset & limit (descending by insertion order)
export async function getTransactions(offset = 0, limit = 100) {
  const db = await getDB()
  const tx = db.transaction(TRANSACTIONS_STORE, 'readonly')
  const store = tx.objectStore(TRANSACTIONS_STORE)

  const results: Transaction[] = []
  let skipped = 0

  // iterate with cursor from the end (most recent first)
  let cursor = await store.openCursor(null, 'prev')
  while (cursor && results.length < limit) {
    if (skipped < offset) {
      skipped++
    } else {
      results.push(cursor.value as Transaction)
    }
    cursor = await cursor.continue()
  }

  await tx.done
  return results
}

export async function clearAll() {
  const db = await getDB()
  return db.clear(TRANSACTIONS_STORE)
}

// Categories management
export interface CustomCategory {
  id?: number
  name: string
  type: 'income' | 'expense' | 'savings'
}

export async function addCategory(cat: Omit<CustomCategory, 'id'>) {
  const db = await getDB()
  return db.add(CATEGORIES_STORE, cat)
}

export async function getCategories(type: 'income' | 'expense' | 'savings') {
  const db = await getDB()
  const allCats = await db.getAll(CATEGORIES_STORE)
  return allCats.filter((c) => c.type === type).map((c) => c.name)
}

export async function getCustomCategoryObjects(type: 'income' | 'expense' | 'savings') {
  const db = await getDB()
  const allCats = await db.getAll(CATEGORIES_STORE)
  return allCats.filter((c) => c.type === type).map((c: any) => ({ id: c.id, name: c.name }))
}

export async function deleteCategory(id: number) {
  const db = await getDB()
  return db.delete(CATEGORIES_STORE, id)
}

export async function updateCategory(id: number, newName: string) {
  const db = await getDB()
  const cat = await db.get(CATEGORIES_STORE, id)
  if (!cat) return
  cat.name = newName
  return db.put(CATEGORIES_STORE, cat)
}

export async function updateSubcategoriesCategoryName(oldName: string, newName: string) {
  const db = await getDB()
  const tx = db.transaction('subcategories', 'readwrite')
  const store = tx.objectStore('subcategories')
  let cursor = await store.openCursor()
  while (cursor) {
    if (cursor.value.categoryName === oldName) {
      cursor.value.categoryName = newName
      await cursor.update(cursor.value)
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function updateTransactionsCategoryName(oldName: string, newName: string) {
  const db = await getDB()
  const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite')
  const store = tx.objectStore(TRANSACTIONS_STORE)
  let cursor = await store.openCursor()
  while (cursor) {
    if (cursor.value.category === oldName) {
      cursor.value.category = newName
      await cursor.update(cursor.value)
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

// Subcategories store: supports custom subcategories per category name
export interface CustomSubcategory {
  id?: number
  name: string
  categoryName: string
}

export async function addSubcategory(sub: Omit<CustomSubcategory, 'id'>) {
  const db = await getDB()
  return db.add('subcategories', sub)
}

export async function getSubcategories(categoryName: string) {
  const db = await getDB()
  const all = await db.getAll('subcategories')
  return all.filter((s: any) => s.categoryName === categoryName).map((s: any) => ({ id: s.id, name: s.name }))
}

export async function deleteSubcategory(id: number) {
  const db = await getDB()
  return db.delete('subcategories', id)
}

export async function deleteSubcategoriesByCategory(categoryName: string) {
  const db = await getDB()
  const tx = db.transaction('subcategories', 'readwrite')
  const store = tx.objectStore('subcategories')
  let cursor = await store.openCursor()
  while (cursor) {
    if (cursor.value.categoryName === categoryName) {
      await cursor.delete()
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

export async function deleteTransactionsByCategory(categoryName: string) {
  const db = await getDB()
  const tx = db.transaction(TRANSACTIONS_STORE, 'readwrite')
  const store = tx.objectStore(TRANSACTIONS_STORE)
  let cursor = await store.openCursor()
  while (cursor) {
    if (cursor.value.category === categoryName) {
      await cursor.delete()
    }
    cursor = await cursor.continue()
  }
  await tx.done
}

// Accounts management
export interface Account {
  id?: number
  name: string
  type: 'Chèque' | 'Épargne' | 'CELI' | 'CELIAPP' | 'REER' | 'Marge de crédit' | 'Marge de crédit hypothécaire' | 'Prêt' | 'Carte de crédit' | 'Fonds de travailleurs' | 'Placements' | 'Hypothèque' | 'Location auto'
  balance: number
}

export async function getAccounts(): Promise<Account[]> {
  const db = await getDB()
  return db.getAll(ACCOUNTS_STORE)
}

export async function addAccount(account: Omit<Account, 'id'>): Promise<number> {
  const db = await getDB()
  const id = await db.add(ACCOUNTS_STORE, account)
  return Number(id) // Ensure the returned ID is a number
}

export async function deleteAccount(id: number): Promise<void> {
  const db = await getDB()
  await db.delete(ACCOUNTS_STORE, id)
}

// Goals management
export interface Goal {
  id?: number
  name: string
  type: string // Allow any custom type
  targetAmount: number
  currentAmount: number
  targetDate: string // ISO format YYYY-MM-DD
  notes?: string
}

export async function getGoals(): Promise<Goal[]> {
  const db = await getDB()
  return db.getAll(GOALS_STORE)
}

export async function addGoal(goal: Omit<Goal, 'id'>): Promise<number> {
  const db = await getDB()
  const id = await db.add(GOALS_STORE, goal)
  return Number(id)
}

export async function updateGoal(goal: Goal): Promise<void> {
  if (!goal.id) throw new Error('Goal id is required')
  const db = await getDB()
  await db.put(GOALS_STORE, goal)
}

export async function deleteGoal(id: number): Promise<void> {
  const db = await getDB()
  await db.delete(GOALS_STORE, id)
}

// Export/Import functions
export async function exportAllData() {
  const db = await getDB()
  const data = {
    version: DB_VERSION,
    exportDate: new Date().toISOString(),
    transactions: await db.getAll(TRANSACTIONS_STORE),
    accounts: await db.getAll(ACCOUNTS_STORE),
    categories: await db.getAll(CATEGORIES_STORE),
    subcategories: await db.getAll('subcategories'),
    goals: await db.getAll(GOALS_STORE)
  }
  return data
}

export async function importAllData(data: any) {
  const db = await getDB()
  const tx = db.transaction([TRANSACTIONS_STORE, ACCOUNTS_STORE, CATEGORIES_STORE, 'subcategories', GOALS_STORE], 'readwrite')
  
  // Clear existing data
  await tx.objectStore(TRANSACTIONS_STORE).clear()
  await tx.objectStore(ACCOUNTS_STORE).clear()
  await tx.objectStore(CATEGORIES_STORE).clear()
  await tx.objectStore('subcategories').clear()
  await tx.objectStore(GOALS_STORE).clear()
  
  // Import new data
  for (const item of data.transactions || []) {
    await tx.objectStore(TRANSACTIONS_STORE).add(item)
  }
  for (const item of data.accounts || []) {
    await tx.objectStore(ACCOUNTS_STORE).add(item)
  }
  for (const item of data.categories || []) {
    await tx.objectStore(CATEGORIES_STORE).add(item)
  }
  for (const item of data.subcategories || []) {
    await tx.objectStore('subcategories').add(item)
  }
  for (const item of data.goals || []) {
    await tx.objectStore(GOALS_STORE).add(item)
  }
  
  await tx.done
}
