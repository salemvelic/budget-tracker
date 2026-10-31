import { describe, expect, it } from 'vitest'

import { isErsteStatement, parseErsteCardClubLines } from './ersteCardClub'
import type { TextLine } from './types'

// Fictional rows that mimic the column layout of the Erste card statement.
const c = (x: number, text: string) => ({ x, text })

const LINES: TextLine[] = [
  [c(38, 'Obavijest o troškovima za: 10/26')],
  [c(38, 'Uplate'), c(96, 'ID1'), c(154, 'ID2')],
  [c(38, '05.10.26'), c(96, 'D100'), c(212, '500,00'), c(270, 'Primljena uplata - Hvala')],
  [c(38, '30.09.26'), c(96, 'D101'), c(212, 'Obračun god. članarine - DEMO'), c(536, '50,00')],
  [c(212, 'KORISNIK')],
  [c(212, 'Ukupno troškovi usluga ESB'), c(535, '50,00')],
  [c(38, '01.10.26'), c(96, 'D102'), c(154, 'D900'), c(212, 'DEMO GROCERS 12 Zagreb'), c(329, 'EUR'), c(539, '1.234,56')],
  [c(38, '02.10.26'), c(96, 'D103'), c(154, 'D901'), c(212, 'DEMO CAFE'), c(329, 'RON'), c(419, '100,00'), c(539, '19,90')],
  [c(212, 'Bucuresti;Tečaj ESB na dan')],
  [c(212, '02.10.26: 5,020000')],
  [c(38, '03.10.26'), c(96, 'D104'), c(154, 'D902'), c(212, 'DEMO SHOP WEB (1/3)'), c(329, 'EUR'), c(539, '10,00')],
  [c(38, '04.10.26'), c(96, 'D105'), c(154, 'D903'), c(212, 'DEMO AIRLINE'), c(329, 'EUR'), c(531, '- 99,00')],
  [c(212, 'Ukupno DEMO'), c(519, '1.215,46 EUR')],
]

describe('isErsteStatement', () => {
  it('detects the statement header', () => {
    expect(isErsteStatement(LINES)).toBe(true)
    expect(isErsteStatement([[c(40, 'Revolut Bank UAB')]])).toBe(false)
  })
})

describe('parseErsteCardClubLines', () => {
  const { rows, skipped } = parseErsteCardClubLines(LINES)

  it('skips payments and keeps charges, installments and refunds', () => {
    expect(skipped).toEqual({ payment: 1 })
    expect(rows.map((r) => r.amountCents)).toEqual([5000, 123456, 1990, 1000, -9900])
  })

  it('uses ID1 for the import hash and converts dates', () => {
    expect(rows[1]).toMatchObject({ date: '2026-10-01', importHash: 'kartica|id:D102', source: 'kartica' })
  })

  it('puts membership in other and appends wrapped description lines', () => {
    expect(rows[0]).toMatchObject({ merchant: 'Obračun god. članarine - DEMO KORISNIK', category: 'other' })
  })

  it('notes foreign amounts and installments, ignoring exchange-rate lines', () => {
    expect(rows[2]).toMatchObject({ merchant: 'DEMO CAFE Bucuresti', note: '100,00 RON' })
    expect(rows[3]?.note).toBe('rata 1/3')
  })

  it('categorizes merchants', () => {
    expect(rows[1]?.category).toBe('food')
  })
})
