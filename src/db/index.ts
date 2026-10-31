import Dexie, { type Table } from 'dexie'

import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { subcategoryUpgrade } from '@/domain/categorize'
import { DEFAULT_SETTINGS, settingsToRows } from '@/domain/settings'

export type TxnSource = 'kartica' | 'revolut' | 'zaba' | 'gotovina'

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

/** `fixed`: counted as spending but reserved up front; `savings`: not spending at all. */
export type CategoryKind = 'fixed' | 'savings'

export interface Category {
  id: string
  nameKey: string
  budgetCents?: number
  kind?: CategoryKind
  /** Subcategory of this top-level category; limits and kind live on the parent. */
  parentId?: string
}

export interface SettingRow {
  key: string
  value: string
}

/** Import hash of a deleted imported transaction, so re-imports don't bring it back. */
export interface IgnoredImport {
  importHash: string
}

class BudgetDatabase extends Dexie {
  txns!: Table<Txn, number>
  rules!: Table<CategoryRule, number>
  categories!: Table<Category, string>
  settings!: Table<SettingRow, string>
  ignoredImports!: Table<IgnoredImport, string>

  constructor() {
    super('budget-tracker')
    this.version(1).stores({
      txns: '++id, date, category, source, &importHash',
      rules: '++id, pattern',
      categories: '&id',
      settings: '&key',
    })
    this.version(2).stores({
      ignoredImports: '&importHash',
    })
    this.version(3)
      .stores({})
      .upgrade(async (tx) => {
        const categories = tx.table<Category, string>('categories')
        const known = new Set(await categories.toCollection().primaryKeys())
        await categories.bulkPut(DEFAULT_CATEGORIES.filter((category) => !known.has(category.id)))
      })
    this.version(4)
      .stores({})
      .upgrade(async (tx) => {
        const categories = tx.table<Category, string>('categories')
        if (!(await categories.get('cash'))) {
          await categories.add({ id: 'cash', nameKey: 'categories.cash' })
        }
      })
    this.version(5)
      .stores({})
      .upgrade(async (tx) => {
        const categories = tx.table<Category, string>('categories')
        if (!(await categories.get('loans'))) {
          await categories.add({ id: 'loans', nameKey: 'categories.loans' })
        }
      })
    this.version(6)
      .stores({})
      .upgrade(async (tx) => {
        const categories = tx.table<Category, string>('categories')
        const loans = await categories.get('loans')
        if (loans && loans.kind == null) await categories.update('loans', { kind: 'fixed' })
        if (!(await categories.get('savings'))) {
          await categories.add({ id: 'savings', nameKey: 'categories.savings', kind: 'savings' })
        }
      })
    this.version(7)
      .stores({})
      .upgrade(async (tx) => {
        const categories = tx.table<Category, string>('categories')
        const known = new Set(await categories.toCollection().primaryKeys())
        const added = ['groceries', 'restaurants', 'going_out', 'bars', 'entertainment', 'travel']
        await categories.bulkAdd(
          DEFAULT_CATEGORIES.filter((category) => added.includes(category.id) && !known.has(category.id)),
        )
        await tx
          .table<Txn, number>('txns')
          .toCollection()
          .modify((txn) => {
            const next = subcategoryUpgrade(txn)
            if (next) txn.category = next
          })
      })
    this.version(8)
      .stores({})
      .upgrade(async (tx) => {
        await tx
          .table<Txn, number>('txns')
          .toCollection()
          .modify((txn) => {
            const next = subcategoryUpgrade(txn)
            if (next) txn.category = next
          })
      })
  }
}

export const db = new BudgetDatabase()

db.on('populate', async () => {
  await db.categories.bulkAdd(DEFAULT_CATEGORIES)
  await db.settings.bulkPut(settingsToRows(DEFAULT_SETTINGS))
})
