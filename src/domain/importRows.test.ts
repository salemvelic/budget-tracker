import { beforeEach, describe, expect, it } from 'vitest'

import { db } from '@/db'
import { buildImportHash } from '@/domain/importers/revolut'

import { filterNewImportRows, importParsedRows } from './importRows'

describe('importParsedRows', () => {
  beforeEach(async () => {
    await db.delete()
    await db.open()
  })

  it('skips duplicates by importHash', async () => {
    const row = {
      date: '2026-10-01',
      amountCents: 1250,
      merchant: 'Demo shop',
      source: 'revolut' as const,
      category: 'food',
      importHash: buildImportHash('2026-10-01', 1250, 'Demo shop'),
    }

    expect(await importParsedRows([row])).toBe(1)
    expect(await filterNewImportRows([row])).toHaveLength(0)
    expect(await importParsedRows([row])).toBe(0)
    expect(await db.txns.count()).toBe(1)
  })
})
