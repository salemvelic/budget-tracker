import { describe, expect, it } from 'vitest'

import { assignImportHashes, dedupeWithinBatch } from './types'

describe('assignImportHashes', () => {
  it('gives distinct hashes for same-day duplicate purchases', () => {
    const draft = {
      date: '2026-10-01',
      amountCents: 250,
      merchant: 'Cafe Demo',
      source: 'revolut' as const,
      category: 'food',
    }
    const rows = assignImportHashes([draft, draft])
    expect(rows[0]!.importHash).not.toBe(rows[1]!.importHash)
    expect(rows[0]!.importHash).toMatch(/\|#0$/)
    expect(rows[1]!.importHash).toMatch(/\|#1$/)
  })
})

describe('dedupeWithinBatch', () => {
  it('keeps first row per importHash', () => {
    const row = {
      date: '2026-10-01',
      amountCents: 100,
      merchant: 'Shop',
      source: 'kartica' as const,
      category: 'other',
      importHash: 'a|#0',
    }
    expect(dedupeWithinBatch([row, row])).toHaveLength(1)
  })
})
