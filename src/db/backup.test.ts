import { beforeEach, describe, expect, it } from 'vitest'

import { readBackupData, restoreBackupData } from './backup'
import { db } from './index'

describe('backup restore', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('replaces local data with the backup', async () => {
    await db.txns.add({
      date: '2026-09-01',
      amountCents: 100,
      merchant: 'Old',
      source: 'gotovina',
      category: 'other',
    })
    const backup = {
      ...(await readBackupData()),
      txns: [
        {
          id: 7,
          date: '2026-10-01',
          amountCents: 500,
          merchant: 'New',
          source: 'kartica' as const,
          category: 'food',
        },
      ],
      ignoredImports: [{ importHash: 'kartica|id:X' }],
    }

    await restoreBackupData(backup)

    expect(await db.txns.toArray()).toEqual(backup.txns)
    expect(await db.ignoredImports.count()).toBe(1)
    expect(await db.categories.count()).toBe(backup.categories.length)
  })

  it('keeps default categories missing from an older backup', async () => {
    const backup = {
      ...(await readBackupData()),
      categories: [{ id: 'food', nameKey: 'categories.food', budgetCents: 20000 }],
    }

    await restoreBackupData(backup)

    expect(await db.categories.get('food')).toMatchObject({ budgetCents: 20000 })
    expect(await db.categories.get('cash')).toBeDefined()
    expect(await db.categories.get('loans')).toBeDefined()
  })

  it('runs data fixes after restore', async () => {
    await restoreBackupData({
      txns: [
        {
          date: '2026-10-01',
          amountCents: 100,
          merchant: 'LIDL P-1 Grad',
          source: 'revolut',
          category: 'food',
        },
      ],
      rules: [],
      categories: [
        { id: 'food', nameKey: 'categories.food' },
        { id: 'other', nameKey: 'categories.other' },
      ],
      settings: [],
      ignoredImports: [],
    })
    expect((await db.txns.toArray())[0]?.category).toBe('groceries')
    expect(await db.categories.get('groceries')).toBeDefined()
  })
})
