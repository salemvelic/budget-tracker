import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { buildImportHash, parseRevolutCsv } from './revolut'

const fixturePath = join(process.cwd(), 'src/domain/importers/__fixtures__/revolut.csv')

describe('parseRevolutCsv', () => {
  it('imports completed card payments with positive cent amounts', () => {
    const csv = readFileSync(fixturePath, 'utf8')
    const rows = parseRevolutCsv(csv)

    expect(rows).toHaveLength(2)
    expect(rows[0]).toMatchObject({
      merchant: 'Orchard Grocers',
      amountCents: 1250,
      category: 'food',
      source: 'revolut',
    })
    expect(rows[1]).toMatchObject({
      merchant: 'Metro Fuel',
      amountCents: 4500,
      category: 'fuel',
    })
  })

  it('skips pending and income rows without merchant spend', () => {
    const csv = readFileSync(fixturePath, 'utf8')
    const rows = parseRevolutCsv(csv)
    expect(rows.some((row) => row.merchant === 'Pending Shop')).toBe(false)
    expect(rows.some((row) => row.merchant === 'Salary top-up')).toBe(false)
  })
})

describe('buildImportHash', () => {
  it('is stable for duplicate detection', () => {
    expect(buildImportHash('2026-10-01', 1250, 'Orchard Grocers')).toBe(
      buildImportHash('2026-10-01', 1250, 'orchard grocers'),
    )
  })
})
