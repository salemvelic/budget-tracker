import { describe, expect, it } from 'vitest'

import { db } from '@/db'
import { recategorizeTxn, saveRuleAndApply } from '@/db/txns'

describe('saveRuleAndApply', () => {
  it('skips locked transactions', async () => {
    await db.delete()
    await db.open()
    await db.txns.bulkAdd([
      {
        date: '2026-10-01',
        amountCents: 100,
        merchant: 'Demo Shop Zagreb',
        source: 'kartica',
        category: 'other',
      },
      {
        date: '2026-10-02',
        amountCents: 200,
        merchant: 'Demo Shop Split',
        source: 'kartica',
        category: 'other',
        categoryLocked: true,
      },
    ])

    const moved = await saveRuleAndApply('demo shop', 'shopping')
    expect(moved).toBe(1)
    const txns = await db.txns.orderBy('id').toArray()
    expect(txns[0]?.category).toBe('shopping')
    expect(txns[1]?.category).toBe('other')
  })
})

describe('recategorizeTxn', () => {
  it('locks the transaction', async () => {
    await db.delete()
    await db.open()
    const id = await db.txns.add({
      date: '2026-10-01',
      amountCents: 100,
      merchant: 'Demo',
      source: 'gotovina',
      category: 'other',
    })
    await recategorizeTxn(
      {
        id,
        merchant: 'Demo',
        category: 'other',
        date: '2026-10-01',
        amountCents: 100,
        source: 'gotovina',
      },
      'food',
    )
    expect(await db.txns.get(id)).toMatchObject({ category: 'food', categoryLocked: true })
  })
})
