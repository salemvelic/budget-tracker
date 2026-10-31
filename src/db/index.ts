import Dexie, { type Table } from 'dexie'

export type TxnSource = 'kartica' | 'revolut' | 'gotovina'

export interface Txn {
  id?: number
  date: string
  amountCents: number
  merchant: string
  source: TxnSource
  category: string
  note?: string
  importHash?: string
}

export interface CategoryRule {
  id?: number
  pattern: string
  category: string
}

export interface Category {
  id: string
  nameKey: string
  budgetCents?: number
}

export interface SettingRow {
  key: string
  value: string
}

class BudgetDatabase extends Dexie {
  txns!: Table<Txn, number>
  rules!: Table<CategoryRule, number>
  categories!: Table<Category, string>
  settings!: Table<SettingRow, string>

  constructor() {
    super('budget-tracker')
    this.version(1).stores({
      txns: '++id, date, category, source, &importHash',
      rules: '++id, pattern',
      categories: '&id',
      settings: '&key',
    })
  }
}

export const db = new BudgetDatabase()
