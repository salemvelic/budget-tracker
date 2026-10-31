import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES } from '@/domain/categories'

import { db } from './index'

describe('schema upgrades', () => {
  afterEach(async () => {
    db.close()
    await Dexie.delete('budget-tracker')
  })

  it('adds categories introduced after v1 to an existing database', async () => {
    db.close()
    await Dexie.delete('budget-tracker')
    const v1 = new Dexie('budget-tracker')
    v1.version(1).stores({ txns: '++id, date, category, source, &importHash', rules: '++id, pattern', categories: '&id', settings: '&key' })
    await v1.open()
    await v1.table('categories').bulkAdd([
      { id: 'food', nameKey: 'categories.food' },
      { id: 'other', nameKey: 'categories.other' },
    ])
    v1.close()

    await db.open()
    const ids = (await db.categories.toArray()).map((c) => c.id).sort()
    expect(ids).toEqual(DEFAULT_CATEGORIES.map((c) => c.id).sort())
  })

  it('marks loans as fixed and adds savings when upgrading from v5', async () => {
    db.close()
    await Dexie.delete('budget-tracker')
    const v5 = new Dexie('budget-tracker')
    v5.version(5).stores({
      txns: '++id, date, category, source, &importHash',
      rules: '++id, pattern',
      categories: '&id',
      settings: '&key',
      ignoredImports: '&importHash',
    })
    await v5.open()
    await v5.table('categories').bulkAdd([
      { id: 'loans', nameKey: 'categories.loans', budgetCents: 80000 },
      { id: 'other', nameKey: 'categories.other' },
    ])
    v5.close()

    await db.open()
    expect(await db.categories.get('loans')).toMatchObject({ kind: 'fixed', budgetCents: 80000 })
    expect(await db.categories.get('savings')).toMatchObject({ kind: 'savings' })
  })

  it('adds subcategories and moves default placements when upgrading from v6', async () => {
    db.close()
    await Dexie.delete('budget-tracker')
    const v6 = new Dexie('budget-tracker')
    v6.version(6).stores({
      txns: '++id, date, category, source, &importHash',
      rules: '++id, pattern',
      categories: '&id',
      settings: '&key',
      ignoredImports: '&importHash',
    })
    await v6.open()
    await v6.table('categories').bulkAdd([
      { id: 'food', nameKey: 'categories.food', budgetCents: 30000 },
      { id: 'transport', nameKey: 'categories.transport' },
      { id: 'other', nameKey: 'categories.other' },
    ])
    const base = { date: '2026-10-01', amountCents: 100, source: 'revolut' }
    await v6.table('txns').bulkAdd([
      { ...base, merchant: 'LIDL P-1 Grad', category: 'food' },
      { ...base, merchant: 'Democafe', category: 'food' },
      { ...base, merchant: 'Demo Beer Store', category: 'other' },
      { ...base, merchant: 'Demo osoba', note: 'Hajduk', category: 'other', source: 'zaba' },
      { ...base, merchant: 'RYANAIR DUBLIN', category: 'transport' },
      { ...base, merchant: 'LIDL P-2 Grad', category: 'shopping' },
      { ...base, merchant: 'Unknown', category: 'other' },
    ])
    v6.close()

    await db.open()
    expect((await db.txns.orderBy('id').toArray()).map((t) => t.category)).toEqual([
      'groceries',
      'bars',
      'bars',
      'entertainment',
      'travel',
      'shopping',
      'other',
    ])
    expect(await db.categories.get('bars')).toMatchObject({ parentId: 'going_out' })
    expect(await db.categories.get('food')).toMatchObject({ budgetCents: 30000 })
  })

  it('recategorizes other rows when upgrading through v8', async () => {
    db.close()
    await Dexie.delete('budget-tracker')
    const v6 = new Dexie('budget-tracker')
    v6.version(6).stores({
      txns: '++id, date, category, source, &importHash',
      rules: '++id, pattern',
      categories: '&id',
      settings: '&key',
      ignoredImports: '&importHash',
    })
    await v6.open()
    await v6.table('categories').bulkAdd([
      { id: 'other', nameKey: 'categories.other' },
      { id: 'travel', nameKey: 'categories.travel' },
    ])
    await v6.table('txns').add({
      date: '2026-10-01',
      amountCents: 500,
      merchant: 'STB Bucuresti',
      source: 'revolut',
      category: 'other',
    })
    v6.close()

    await db.open()
    expect((await db.txns.toArray())[0]?.category).toBe('travel')
  })
})
