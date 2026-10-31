import { describe, expect, it } from 'vitest'

import { parsePdfStatement } from './pdfStatement'
import type { TextLine } from './types'
import { buildZabaFixtureLines, buildE2eZabaLines } from './zabaPrint'
import { isZabaStatement, parseZabaLines } from './zaba'

const c = (x: number, text: string) => ({ x, text })
const HOLDER = 'IVA DEMO'
const header: TextLine[] = [
  [c(42, 'Račun'), c(102, 'Valuta'), c(463, 'Vrsta prometa')],
  [c(42, 'Dat. val.'), c(102, 'Opis prometa'), c(472, 'Priljev'), c(539, 'Odljev')],
]

const LINES = buildZabaFixtureLines()

describe('buildE2eZabaLines', () => {
  it('includes salary in the current month', () => {
    const { rows } = parseZabaLines(buildE2eZabaLines(new Date('2026-10-15')))
    expect(rows.some((row) => row.category === 'income' && row.amountCents === 150_000)).toBe(true)
  })
})

describe('isZabaStatement', () => {
  it('detects the statement header', () => {
    expect(isZabaStatement(LINES)).toBe(true)
    expect(isZabaStatement([[c(40, 'Revolut Bank UAB')]])).toBe(false)
  })

  it('is detected before Erste even though it quotes the Erste bill', () => {
    expect(parsePdfStatement(LINES).kind).toBe('zaba')
  })
})

describe('parseZabaLines', () => {
  const { rows, skipped } = parseZabaLines(LINES)

  it('imports current-account spending and ignores loan sub-accounts', () => {
    expect(rows.map((r) => [r.date, r.merchant, r.amountCents, r.category, r.note])).toEqual([
      ['2026-10-01', 'DEMO GROCERS Zagreb', 1230, 'groceries', undefined],
      ['2026-10-03', 'Demo Shop online Zagreb', 2500, 'other', 'rata 2/6'],
      [
        '2026-10-05',
        'OSOBNO PRIMANJE ISPLAĆENO U CIJELOSTI Demo d.o.o.',
        150000,
        'income',
        undefined,
      ],
      ['2026-10-06', 'DEMO KLUB', 4000, 'entertainment', 'Ulaznica Hajduk'],
      ['2026-10-07', 'Bankomat Banke DEMO TRG 1 ZAGREB', 5000, 'cash', undefined],
      ['2026-10-08', 'DEMO RESTORAN SPLIT', -800, 'restaurants', undefined],
      ['2026-10-15', 'Otplata kredita', 30000, 'loans', 'stambeni kredit'],
      ['2026-10-16', 'Naknada za vođenje računa', 300, 'subscriptions', undefined],
    ])
  })

  it('skips Revolut top-ups and the Erste card bill', () => {
    expect(skipped).toEqual({ transfer: 1, payment: 1 })
  })

  it('uses the bank reference for the import hash', () => {
    expect(rows[0]?.importHash).toBe('zaba|id:B100000000000001')
    expect(rows.every((r) => r.source === 'zaba')).toBe(true)
  })

  it('continues the current account after a page-break header', () => {
    const lines: TextLine[] = [
      [c(42, 'Zagrebačka banka d.d.')],
      [c(361, HOLDER)],
      ...header,
      [c(102, 'EUR'), c(129, 'POČETNO STANJE'), c(201, 'Tekući račun u eurima'), c(467, '500,00')],
      [
        c(51, '01.10.2026.'),
        c(102, `B100000000000001 Kupovina DEMO GROCERS Zagreb HR ${HOLDER}`),
        c(540, '12,30'),
      ],
      [c(102, 'NOVO STANJE EUR'), c(467, '487,70')],
      ...header,
      [
        c(51, '05.10.2026.'),
        c(102, 'N100000000000005 OSOBNO PRIMANJE ISPLAĆENO U CIJELOSTI Demo d.o.o.'),
        c(462, '1.500,00'),
      ],
      [c(102, 'Zbroj prometa:'), c(462, '1.500,00'), c(530, '12,30')],
      [c(102, 'NOVO STANJE EUR'), c(467, '1.975,70')],
    ]
    const { rows: parsed } = parseZabaLines(lines)
    expect(parsed.some((row) => row.category === 'income' && row.amountCents === 150000)).toBe(true)
  })
})
