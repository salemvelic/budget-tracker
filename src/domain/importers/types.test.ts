import { describe, expect, it } from 'vitest'

import { assignImportHashes, countSkip, dedupeWithinBatch, mergeSkipped, type ImportSkipped } from './types'

const draft = {
  date: '2026-10-01',
  amountCents: 250,
  merchant: 'Cafe Demo',
  source: 'revolut' as const,
  category: 'food',
}

describe('assignImportHashes', () => {
  it('gives distinct hashes for same-day duplicate purchases', () => {
    const rows = assignImportHashes([draft, draft])
    expect(rows[0]!.importHash).not.toBe(rows[1]!.importHash)
    expect(rows[0]!.importHash).toMatch(/\|#0$/)
    expect(rows[1]!.importHash).toMatch(/\|#1$/)
  })

  it('uses the external id when present and drops it from the row', () => {
    const [row] = assignImportHashes([{ ...draft, source: 'kartica', externalId: 'X1' }])
    expect(row!.importHash).toBe('kartica|id:X1')
    expect(row).not.toHaveProperty('externalId')
  })
})

describe('dedupeWithinBatch', () => {
  it('keeps first row per importHash', () => {
    const row = { ...draft, importHash: 'a|#0' }
    expect(dedupeWithinBatch([row, row])).toHaveLength(1)
  })
})

describe('countSkip', () => {
  it('increments per reason', () => {
    const skipped: ImportSkipped = {}
    countSkip(skipped, 'transfer')
    countSkip(skipped, 'transfer')
    expect(skipped).toEqual({ transfer: 2 })
  })
})

describe('mergeSkipped', () => {
  it('adds counts per reason across files', () => {
    expect(mergeSkipped({ transfer: 2, pending: 1 }, {}, { transfer: 3, income: 1 })).toEqual({
      transfer: 5,
      pending: 1,
      income: 1,
    })
  })
})
