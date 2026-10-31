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
})
