import { describe, expect, it } from 'vitest'

import { parseErsteCardClubLines } from './ersteCardClub'

const SAMPLE_LINES = [
  'Erste Card Club izvod',
  'Datum transakcije Datum knjiženja Opis Iznos',
  '01.10.2026. 02.10.2026. DEMO GROCERS ZG 45,99',
  '05.10.2026. 06.10.2026. DEMO GROCERS ZG 45,99 2/3',
  '10.10.2026. 11.10.2026. UPLATA -500,00',
  '12.10.2026. 13.10.2026. CASHBACK PROGRAM -5,50',
  '01.10.2026. 02.10.2026. CARD CLUB FEE 2,00',
  'not a transaction row',
]

describe('parseErsteCardClubLines', () => {
  it('parses purchases, installments, cashback and skips payments', () => {
    const { rows, skipped } = parseErsteCardClubLines(SAMPLE_LINES)

    expect(rows).toHaveLength(4)
    expect(rows[0]).toMatchObject({ amountCents: 4599, merchant: 'DEMO GROCERS ZG', category: 'food' })
    expect(rows[1]?.merchant).toContain('rata 2/3')
    expect(rows.find((r) => r.amountCents === -550)).toBeTruthy()
    expect(rows.find((r) => r.merchant.includes('CARD CLUB FEE'))?.category).toBe('other')
    expect(skipped.payment).toBe(1)
    expect(skipped.nonTransaction).toBeGreaterThanOrEqual(1)
  })
})
