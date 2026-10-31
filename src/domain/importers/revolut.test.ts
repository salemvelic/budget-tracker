import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { parseRevolutCsv } from './revolut'

const fixturePath = join(process.cwd(), 'src/domain/importers/__fixtures__/revolut.csv')

describe('parseRevolutCsv', () => {
  it('imports card payments with fees and refunds', () => {
    const csv = readFileSync(fixturePath, 'utf8')
    const { rows, skipped } = parseRevolutCsv(csv)

    expect(rows).toHaveLength(5)
    expect(rows[0]!).toMatchObject({
      merchant: 'Orchard Grocers',
      amountCents: 1300,
      category: 'food',
    })
    expect(rows[0]!.importHash).toMatch(/\|#0$/)
    expect(rows[2]!.importHash).toMatch(/\|#1$/)
    expect(rows.find((r) => r.amountCents === -500)).toBeTruthy()
    expect(skipped.otherType).toBeGreaterThanOrEqual(2)
    expect(skipped.foreignCurrency).toBe(1)
    expect(skipped.notCompleted).toBe(1)
  })

  it('throws when headers are not Revolut', () => {
    expect(() => parseRevolutCsv('foo,bar\n1,2')).toThrow('csv.notRevolut')
  })
})
