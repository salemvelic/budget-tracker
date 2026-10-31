import { beforeEach, describe, expect, it } from 'vitest'
import { ref } from 'vue'

import { assignImportHashes } from '@/domain/importers/types'

import { db } from './index'
import { filterNewImportRows, importParsedRows } from './importRows'
import { deleteTxn } from './txns'

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

  it('does not re-import a transaction the user deleted', async () => {
    const row = assignImportHashes([
      {
        date: '2026-10-02',
        amountCents: 900,
        merchant: 'Deleted later',
        source: 'kartica',
        category: 'other',
        externalId: 'D1',
      },
    ])[0]!

    await importParsedRows([row])
    const stored = await db.txns.where('importHash').equals(row.importHash).first()
    await deleteTxn(stored!.id!)

    expect(await db.txns.count()).toBe(0)
    expect(await importParsedRows([row])).toBe(0)
  })

  it('stores rows held in Vue reactive state', async () => {
    const preview = ref(
      assignImportHashes([
        {
          date: '2026-10-04',
          amountCents: 700,
          merchant: 'Demo pharmacy',
          source: 'kartica',
          category: 'other',
          note: 'rata 1/3',
          externalId: 'D2',
        },
      ]),
    )

    expect(await importParsedRows(preview.value)).toBe(1)
    expect(await db.txns.count()).toBe(1)
  })

  it('deletes manual transactions without leaving a tombstone', async () => {
    const id = await db.txns.add({
      date: '2026-10-03',
      amountCents: 100,
      merchant: 'Manual',
      source: 'gotovina',
      category: 'other',
    })
    await deleteTxn(id)
    expect(await db.ignoredImports.count()).toBe(0)
  })
})
