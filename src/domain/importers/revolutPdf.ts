import { categorizeDescription } from '@/domain/categorize'
import { parseHrAmount } from '@/domain/money'
import { lineText } from '@/domain/importers/pdfLines'
import {
  assignImportHashes,
  countSkip,
  type ImportParseResult,
  type ImportSkipped,
  type ParsedImportRowDraft,
  type TextCell,
  type TextLine,
} from '@/domain/importers/types'

/** Column x-ranges on the Revolut account statement ("Izvadak za EUR"). */
const COL = {
  dateMax: 100,
  descMax: 300,
  sentMax: 400,
  receivedMax: 480,
} as const

const MONTHS: Record<string, string> = {
  sij: '01',
  velj: '02',
  ožu: '03',
  tra: '04',
  svi: '05',
  lip: '06',
  srp: '07',
  kol: '08',
  ruj: '09',
  lis: '10',
  stu: '11',
  pro: '12',
}

const DATE_RE = /^(\d{1,2})\. (\p{L}+) (\d{4})\.$/u
const TRAILING_AMOUNT_RE = /\s(\d{1,3}(?:\.\d{3})*,\d{2})€$/u
const CASH_RE = /^(podizanje gotovine|atm\b)/iu
const FEE_RE = /^naknada\b/iu

type Section = 'none' | 'pending' | 'reversed' | 'booked'
type CategorizeFn = (description: string) => string

interface RawRow {
  date: string
  desc: string
  sent?: string
  received?: string
  balance?: string
  card: boolean
}

export function isRevolutStatement(lines: TextLine[]): boolean {
  const texts = lines.map(lineText)
  return texts.some((t) => t.includes('Revolut Bank UAB')) && texts.some((t) => /Izvadak za [A-Z]{3}/.test(t))
}

function isoDate(raw: string): string | null {
  const match = raw.match(DATE_RE)
  if (!match) return null
  const [, day, monthName, year] = match
  const month = MONTHS[monthName!.toLowerCase()]
  return month ? `${year}-${month}-${day!.padStart(2, '0')}` : null
}

function cellIn(line: TextLine, min: number, max: number): TextCell | undefined {
  return line.find((cell) => cell.x >= min && cell.x < max)
}

function tryAmount(raw: string | undefined): number | null {
  if (!raw) return null
  try {
    return parseHrAmount(raw)
  } catch {
    return null
  }
}

function sectionFor(text: string): Section | null {
  if (text.startsWith('Na čekanju od')) return 'pending'
  if (text.startsWith('Stornirano od')) return 'reversed'
  if (text.startsWith('Transakcije po računu od')) return 'booked'
  return null
}

export function parseRevolutPdfLines(
  lines: TextLine[],
  categorize: CategorizeFn = categorizeDescription,
): ImportParseResult {
  const skipped: ImportSkipped = {}
  const drafts: ParsedImportRowDraft[] = []
  let currency: string | null = null
  let section: Section = 'none'
  let previousBalance: number | null = null
  let current: RawRow | null = null

  const finish = (row: RawRow) => {
    const balance = tryAmount(row.balance)
    let desc = row.desc
    let outflow: number | null = null

    const sent = tryAmount(row.sent)
    const received = tryAmount(row.received)
    if (sent != null) outflow = Math.abs(sent)
    else if (received != null) outflow = -Math.abs(received)
    else {
      // pdf.js sometimes glues the amount onto the description; the balance change gives the sign.
      const trailing = desc.match(TRAILING_AMOUNT_RE)
      const magnitude = tryAmount(trailing?.[1])
      if (trailing && magnitude != null && balance != null && previousBalance != null) {
        desc = desc.slice(0, trailing.index).trim()
        outflow = balance < previousBalance ? magnitude : -magnitude
      }
    }
    if (balance != null) previousBalance = balance

    if (outflow == null || outflow === 0) {
      countSkip(skipped, 'unparseable')
      return
    }
    if (CASH_RE.test(desc)) {
      countSkip(skipped, 'cash')
      return
    }

    const isFee = !row.card && outflow > 0 && FEE_RE.test(desc)
    if (!row.card && !isFee) {
      countSkip(skipped, 'transfer')
      return
    }

    drafts.push({
      date: row.date,
      amountCents: outflow,
      merchant: desc,
      source: 'revolut',
      category: isFee ? 'subscriptions' : categorize(desc),
    })
  }

  for (const line of lines) {
    const text = lineText(line)

    const header = text.match(/Izvadak za ([A-Z]{3})/)
    if (header) {
      if (header[1] !== currency) section = 'none'
      currency = header[1]!
    }
    const nextSection = sectionFor(text)
    if (nextSection) {
      if (current) finish(current)
      current = null
      section = nextSection
      continue
    }

    const first = line[0]
    const date = first && first.x < COL.dateMax ? isoDate(first.text) : null

    if (!date) {
      if (current && text.startsWith('Kartica:')) current.card = true
      continue
    }

    if (current) finish(current)
    current = null

    if (section === 'pending') {
      countSkip(skipped, 'pending')
      continue
    }
    if (section === 'reversed') {
      countSkip(skipped, 'reversed')
      continue
    }
    if (section !== 'booked') continue
    if (currency !== 'EUR') {
      countSkip(skipped, 'foreignCurrency')
      continue
    }

    current = {
      date,
      desc: cellIn(line, COL.dateMax, COL.descMax)?.text ?? '',
      sent: cellIn(line, COL.descMax, COL.sentMax)?.text,
      received: cellIn(line, COL.sentMax, COL.receivedMax)?.text,
      balance: line.find((cell) => cell.x >= COL.receivedMax)?.text,
      card: false,
    }
  }
  if (current) finish(current)

  return { rows: assignImportHashes(drafts), skipped }
}
