import { beforeEach, describe, expect, it } from 'vitest'

import { assignImportHashes } from '@/domain/importers/types'

import { db } from './index'
import { filterNewImportRows, importParsedRows } from './importRows'

describe('importParsedRows', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('skips duplicates by importHash', async () => {
    const row = assignImportHashes([
      {
        date: '2026-10-01',
        amountCents: 1250,
        merchant: 'Demo shop',
        source: 'revolut',
        category: 'food',
      },
    ])[0]!

    expect(await importParsedRows([row])).toBe(1)
    expect(await filterNewImportRows([row])).toHaveLength(0)
    expect(await importParsedRows([row])).toBe(0)
    expect(await db.txns.count()).toBe(1)
  })

  it('dedupes duplicate hashes within one batch', async () => {
    const row = assignImportHashes([
      {
        date: '2026-10-01',
        amountCents: 500,
        merchant: 'Once',
        source: 'revolut',
        category: 'other',
      },
    ])[0]!

    expect(await importParsedRows([row, row])).toBe(1)
    expect(await db.txns.count()).toBe(1)
  })
})
