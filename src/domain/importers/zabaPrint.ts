import { lineText } from '@/domain/importers/pdfLines'
import type { TextCell, TextLine } from '@/domain/importers/types'

const c = (x: number, text: string): TextCell => ({ x, text })

const HOLDER = 'IVA DEMO'

const header: TextLine[] = [
  [c(42, 'Račun'), c(102, 'Valuta'), c(463, 'Vrsta prometa')],
  [c(42, 'Dat. val.'), c(102, 'Opis prometa'), c(472, 'Priljev'), c(539, 'Odljev')],
]

function hrDate(day: number, year: number, month: number): string {
  const mm = String(month).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${dd}.${mm}.${year}.`
}

/** Minimal fictional ZABA statement with a page break and salary row (dates in `reference`). */
export function buildE2eZabaLines(reference = new Date()): TextLine[] {
  const year = reference.getFullYear()
  const month = reference.getMonth() + 1
  const d1 = hrDate(1, year, month)
  const d5 = hrDate(5, year, month)

  return [
    [c(42, 'Zagrebačka banka d.d.')],
    [c(361, HOLDER)],
    ...header,
    [c(102, 'EUR'), c(129, 'POČETNO STANJE'), c(201, 'Tekući račun u eurima'), c(467, '500,00')],
    [
      c(51, d1),
      c(102, `B100000000000001 Kupovina DEMO GROCERS Zagreb HR ${HOLDER}`),
      c(540, '12,30'),
    ],
    [c(102, 'NOVO STANJE EUR'), c(467, '487,70')],
    ...header,
    [
      c(51, d5),
      c(102, 'N100000000000005 OSOBNO PRIMANJE ISPLAĆENO U CIJELOSTI Demo d.o.o.'),
      c(462, '1.500,00'),
    ],
    [c(102, 'Zbroj prometa:'), c(462, '1.500,00'), c(530, '12,30')],
    [c(102, 'NOVO STANJE EUR'), c(467, '1.975,70')],
  ]
}

/** Full fixture used by unit tests (fixed October 2026 dates). */
export function buildZabaFixtureLines(): TextLine[] {
  const d = (day: number) => hrDate(day, 2026, 10)
  return [
    [c(42, 'Zagrebačka banka d.d.')],
    [c(361, '000000-U0000000000000')],
    [c(361, HOLDER)],
    [c(361, 'DEMO ULICA 1')],
    ...header,
    [c(42, '9000000001 - dospjelo')],
    [c(102, 'EUR'), c(129, 'POČETNO STANJE'), c(201, '(stambeni kredit)'), c(477, '0,00')],
    [c(51, d(1)), c(102, 'dospjela glavnica iz rate/anuiteta'), c(536, '300,00')],
    [c(51, d(15)), c(102, `podmirenje izravnim terećenjem sa računa${HOLDER}`), c(468, '300,00')],
    [c(102, 'Zbroj prometa:'), c(468, '300,00'), c(536, '300,00')],
    [c(102, 'NOVO STANJE EUR'), c(477, '0,00')],
    ...header,
    [c(42, 'HR0000000000000000001 (IBAN)')],
    [c(102, 'EUR'), c(129, 'POČETNO STANJE'), c(201, 'Tekući račun u eurima'), c(467, '500,00')],
    [
      c(51, d(1)),
      c(102, `B100000000000001 Kupovina DEMO GROCERS Zagreb HR ${HOLDER}`),
      c(540, '12,30'),
    ],
    [
      c(51, d(2)),
      c(102, `B100000000000002 Kupovina Revolut**0000* Dublin IE ${HOLDER}`),
      c(536, '100,00'),
    ],
    [
      c(51, d(3)),
      c(102, 'O100000000000003 Naplata obroka 2 od 6 Demo Shop online Zagreb00 broj'),
      c(540, '25,00'),
    ],
    [c(102, 'kartice: XX0000')],
    [
      c(51, d(4)),
      c(102, 'M100000000000004 Kreditni transfer nacionalni u eurima on-line bankarstvom (m-zaba)'),
      c(536, '200,00'),
    ],
    [c(102, 'ERSTE STEIERMAERKISCHE BANK DD HR0000000000000000002 CDBL HR05')],
    [c(102, '000000000-0000000000 Obavijest o troškovima za: 09/26 Platiti do: 12.10.2026')],
    [c(531, 'str. 1 od 2')],
    [c(577, 'IZVGRA2')],
    ...header,
    [
      c(51, d(5)),
      c(102, 'N100000000000005 OSOBNO PRIMANJE ISPLAĆENO U CIJELOSTI Demo d.o.o.'),
      c(462, '1.500,00'),
    ],
    [
      c(51, d(6)),
      c(102, 'M100000000000006 Kreditni transfer nacionalni u eurima on-line bankarstvom (m-zaba)'),
      c(540, '40,00'),
    ],
    [c(102, '- instant DEMO KLUB HR0000000000000000003 HR00 0000-1 Ulaznica Hajduk')],
    [
      c(51, d(7)),
      c(102, 'B100000000000007 Podizanje gotovog novca - debitnom karticom na bankomatu Banke'),
      c(540, '50,00'),
    ],
    [c(102, `DEMO TRG 1 ZAGREB ${HOLDER}`)],
    [
      c(51, d(8)),
      c(102, `B100000000000008 Kupovina DEMO RESTORAN SPLIT HR ${HOLDER}`),
      c(477, '8,00'),
    ],
    [
      c(51, d(15)),
      c(
        102,
        'O100000000000009 Izvršenje izravnog terećenja za otplatu kredita i troškova po kreditnim',
      ),
      c(536, '300,00'),
    ],
    [c(102, `karticama br. 2 ${HOLDER} HR0000000000000000004 HR17 9000000001 OTPLATA KREDITA`)],
    [c(51, d(16)), c(102, 'O100000000000010 Naknada za vođenje računa'), c(545, '3,00')],
    [c(102, 'Zbroj prometa:'), c(462, '1.508,00'), c(530, '727,30')],
    [c(102, 'NOVO STANJE EUR'), c(467, '1.280,70')],
  ]
}

export function splitZabaPages(lines: TextLine[]): TextLine[][] {
  const breakAt = lines.findIndex((line) => lineText(line).startsWith('NOVO STANJE'))
  if (breakAt < 0) return [lines]
  return [lines.slice(0, breakAt + 1), lines.slice(breakAt + 1)]
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** HTML for Chromium printToPDF; row index maps to vertical position. */
export function zabaPagesToHtml(pages: TextLine[][], rowHeightPt = 14, topPt = 36): string {
  const renderPage = (pageLines: TextLine[]) => {
    const texts = pageLines.flatMap((line, rowIndex) => {
      const y = topPt + rowIndex * rowHeightPt + 10
      return line.map(
        (cell) =>
          `<text x="${cell.x}" y="${y}" font-family="Helvetica,Arial,sans-serif" font-size="8">${escapeHtml(cell.text)}</text>`,
      )
    })
    return `<svg xmlns="http://www.w3.org/2000/svg" width="595pt" height="842pt" viewBox="0 0 595 842">${texts.join('')}</svg>`
  }

  return pages.map(renderPage).join('<div style="page-break-before:always"></div>')
}
