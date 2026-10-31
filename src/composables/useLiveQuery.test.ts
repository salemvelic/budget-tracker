import { effectScope, ref, type Ref } from 'vue'
import { beforeEach, describe, expect, it } from 'vitest'

import { db, type Txn } from '@/db'
import { monthRange } from '@/domain/month'

import { useLiveQuery } from './useLiveQuery'

describe('useLiveQuery', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('re-runs query when deps change', async () => {
    await db.txns.add({
      date: '2026-10-15',
      amountCents: 100,
      merchant: 'October shop',
      source: 'kartica',
      category: 'food',
    })
    await db.txns.add({
      date: '2026-11-05',
      amountCents: 200,
      merchant: 'November shop',
      source: 'kartica',
      category: 'food',
    })

    const selectedMonth = ref('2026-10')
    const scope = effectScope()
    let txns!: Ref<Txn[]>

    scope.run(() => {
      txns = useLiveQuery(
        async () => {
          const { start, end } = monthRange(selectedMonth.value)
          return db.txns.where('date').between(start, end, true, true).toArray()
        },
        [],
        selectedMonth,
      )
    })

    await waitFor(() => txns.value.length === 1)
    expect(txns.value[0]?.merchant).toBe('October shop')

    selectedMonth.value = '2026-11'
    await waitFor(() => txns.value[0]?.merchant === 'November shop')
    expect(txns.value).toHaveLength(1)

    scope.stop()
  })
})

async function waitFor(predicate: () => boolean, timeoutMs = 2000): Promise<void> {
  const start = Date.now()
  while (!predicate()) {
    if (Date.now() - start > timeoutMs) {
      throw new Error('Timeout waiting for condition')
    }
    await new Promise((resolve) => setTimeout(resolve, 20))
  }
}
