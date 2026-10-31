import { describe, expect, it } from 'vitest'

import { parsePdfStatement } from './pdfStatement'
import type { TextLine } from './types'
import { isZabaStatement, parseZabaLines } from './zaba'

// Fictional rows that mimic the column layout of the ZABA "Jedinstveni izvadak građana".
const c = (x: number, text: string) => ({ x, text })
const HOLDER = 'IVA DEMO'
const header: TextLine[] = [
  [c(42, 'Račun'), c(102, 'Valuta'), c(463, 'Vrsta prometa')],
  [c(42, 'Dat. val.'), c(102, 'Opis prometa'), c(472, 'Priljev'), c(539, 'Odljev')],
]

const LINES: TextLine[] = [
  [c(42, 'Zagrebačka banka d.d.')],
  [c(361, '000000-U0000000000000')],
  [c(361, HOLDER)],
  [c(361, 'DEMO ULICA 1')],
  ...header,
  [c(42, '9000000001 - dospjelo')],
  [c(102, 'EUR'), c(129, 'POČETNO STANJE'), c(201, '(stambeni kredit)'), c(477, '0,00')],
  [c(51, '01.10.2026.'), c(102, 'dospjela glavnica iz rate/anuiteta'), c(536, '300,00')],
  [
    c(51, '15.10.2026.'),
    c(102, `podmirenje izravnim terećenjem sa računa${HOLDER}`),
    c(468, '300,00'),
  ],
  [c(102, 'Zbroj prometa:'), c(468, '300,00'), c(536, '300,00')],
  [c(102, 'NOVO STANJE EUR'), c(477, '0,00')],
  ...header,
  [c(42, 'HR0000000000000000001 (IBAN)')],
  [c(102, 'EUR'), c(129, 'POČETNO STANJE'), c(201, 'Tekući račun u eurima'), c(467, '500,00')],
  [
    c(51, '01.10.2026.'),
    c(102, `B100000000000001 Kupovina DEMO GROCERS Zagreb HR ${HOLDER}`),
    c(540, '12,30'),
  ],
  [
    c(51, '02.10.2026.'),
    c(102, `B100000000000002 Kupovina Revolut**0000* Dublin IE ${HOLDER}`),
    c(536, '100,00'),
  ],
  [
    c(51, '03.10.2026.'),
    c(102, 'O100000000000003 Naplata obroka 2 od 6 Demo Shop online Zagreb00 broj'),
    c(540, '25,00'),
  ],
  [c(102, 'kartice: XX0000')],
  [
    c(51, '04.10.2026.'),
    c(102, 'M100000000000004 Kreditni transfer nacionalni u eurima on-line bankarstvom (m-zaba)'),
    c(536, '200,00'),
  ],
  [c(102, 'ERSTE STEIERMAERKISCHE BANK DD HR0000000000000000002 CDBL HR05')],
  [c(102, '000000000-0000000000 Obavijest o troškovima za: 09/26 Platiti do: 12.10.2026')],
  [c(531, 'str. 1 od 2')],
  [c(577, 'IZVGRA2')],
  ...header,
  [
    c(51, '05.10.2026.'),
    c(102, 'N100000000000005 OSOBNO PRIMANJE ISPLAĆENO U CIJELOSTI Demo d.o.o.'),
    c(462, '1.500,00'),
  ],
  [
    c(51, '06.10.2026.'),
    c(102, 'M100000000000006 Kreditni transfer nacionalni u eurima on-line bankarstvom (m-zaba)'),
    c(540, '40,00'),
  ],
  [c(102, '- instant DEMO KLUB HR0000000000000000003 HR00 0000-1 Ulaznica Hajduk')],
  [
    c(51, '07.10.2026.'),
    c(102, 'B100000000000007 Podizanje gotovog novca - debitnom karticom na bankomatu Banke'),
    c(540, '50,00'),
  ],
  [c(102, `DEMO TRG 1 ZAGREB ${HOLDER}`)],
  [
    c(51, '08.10.2026.'),
    c(102, `B100000000000008 Kupovina DEMO RESTORAN SPLIT HR ${HOLDER}`),
    c(477, '8,00'),
  ],
  [
    c(51, '15.10.2026.'),
    c(
      102,
      'O100000000000009 Izvršenje izravnog terećenja za otplatu kredita i troškova po kreditnim',
    ),
    c(536, '300,00'),
  ],
  [c(102, `karticama br. 2 ${HOLDER} HR0000000000000000004 HR17 9000000001 OTPLATA KREDITA`)],
  [c(51, '16.10.2026.'), c(102, 'O100000000000010 Naknada za vođenje računa'), c(545, '3,00')],
  [c(102, 'Zbroj prometa:'), c(462, '1.508,00'), c(530, '727,30')],
  [c(102, 'NOVO STANJE EUR'), c(467, '1.280,70')],
]

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
