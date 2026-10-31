import { describe, expect, it } from 'vitest'

import { isRevolutStatement, parseRevolutPdfLines } from './revolutPdf'
import type { TextLine } from './types'

// Fictional rows that mimic the column layout of the Revolut account statement.
const c = (x: number, text: string) => ({ x, text })
const card = [c(125, 'Kartica: 400000******0000')]

const LINES: TextLine[] = [
  [c(415, 'Izvadak za USD'), c(490, 'Revolut Bank UAB')],
  [c(43, 'Račun (Tekući račun)'), c(253, '0,00$')],
  [c(416, 'Izvadak za EUR'), c(490, 'Revolut Bank UAB')],
  [c(40, 'Na čekanju od 1. listopada 2026. do 31. listopada 2026.')],
  [c(43, '31. lis 2026.'), c(125, 'Pending Shop'), c(335, '5,00€')],
  card,
  [c(40, 'Transakcije po računu od 1. listopada 2026. do 31. listopada 2026.')],
  [c(43, 'Datum'), c(125, 'Opis'), c(335, 'Poslani novac')],
  [c(43, '1. lis 2026.'), c(125, 'Nadoplata od *0000'), c(417, '40,00€'), c(526, '140,00€')],
  [c(43, '1. lis 2026.'), c(125, 'To Demo portfolio'), c(335, '3,10€'), c(526, '136,90€')],
  [c(43, '2. lis 2026.'), c(125, 'Demo Grocers'), c(335, '1.012,50€'), c(526, '126,98€')],
  [c(125, 'Revolut tečaj: 1,00€ = 5,30 RON'), c(335, '66,25 RON')],
  card,
  [c(43, '3. lis 2026.'), c(125, 'Podizanje gotovine na lokaciji: Demo 1'), c(335, '51,00€'), c(531, '75,98€')],
  [c(125, 'Naknada: 1,00€'), c(335, '50,00€')],
  card,
  [c(43, '4. lis 2026.'), c(125, 'Demo Taxi'), c(417, '2,40€'), c(526, '78,38€')],
  card,
  [c(43, '4. lis 2026.'), c(125, 'ATM Demo Bank'), c(417, '20,00€'), c(526, '98,38€')],
  card,
  [c(43, '5. lis 2026.'), c(125, 'To Robo portfolio'), c(335, '0,40€'), c(531, '97,98€')],
  [c(43, '5. lis 2026.'), c(125, 'To Robo portfolio'), c(335, '0,35€'), c(531, '97,63€')],
  [c(43, '5. lis 2026.'), c(125, 'Na investicijski račun'), c(335, '20,00€'), c(531, '77,63€')],
  [c(43, '5. lis 2026.'), c(125, 'Naknada za Premium plan'), c(335, '9,99€'), c(531, '67,92€')],
  [c(43, '6. lis 2026.'), c(125, 'Demo Shop 7,92€'), c(531, '60,00€')],
  card,
  [c(40, 'Stornirano od 1. rujna 2026. do 30. rujna 2026.')],
  [c(43, '9. ruj 2026.'), c(125, 'Reverted Shop'), c(335, '9,00€')],
  card,
]

describe('isRevolutStatement', () => {
  it('detects Revolut statements', () => {
    expect(isRevolutStatement(LINES)).toBe(true)
    expect(isRevolutStatement([[c(38, 'Obavijest o troškovima')]])).toBe(false)
  })
})

describe('parseRevolutPdfLines', () => {
  const { rows, skipped } = parseRevolutPdfLines(LINES)

  it('imports card spend, cash withdrawals, card refunds and plan fees', () => {
    expect(rows.map((r) => [r.date, r.merchant, r.amountCents, r.category])).toEqual([
      ['2026-10-02', 'Demo Grocers', 101250, 'food'],
      ['2026-10-03', 'Podizanje gotovine na lokaciji: Demo 1', 5100, 'cash'],
      ['2026-10-04', 'Demo Taxi', -240, 'transport'],
      ['2026-10-04', 'ATM Demo Bank', -2000, 'cash'],
      ['2026-10-05', 'Naknada za Premium plan', 999, 'subscriptions'],
      ['2026-10-06', 'Demo Shop', 792, 'other'],
      ['2026-10-05', 'Revolut Robo portfolio', 75, 'savings'],
      ['2026-10-05', 'Revolut investicijski račun', 2000, 'savings'],
    ])
    expect(rows[0]?.source).toBe('revolut')
    expect(rows[6]?.note).toBe('2 uplata')
  })

  it('skips top-ups, investments, pending and reversed rows', () => {
    expect(skipped).toEqual({ pending: 1, transfer: 2, reversed: 1 })
  })
})
