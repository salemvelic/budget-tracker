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

/** Column x-ranges on the Erste card statement ("Obavijest o troškovima"). */
const COL = {
  dateMax: 80,
  id1Max: 140,
  descMin: 200,
  descMax: 320,
  currencyMax: 370,
  amountMin: 490,
} as const

const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{2})$/
const ID_RE = /^D\d+$/
const AMOUNT_RE = /^-?\s?\d{1,3}(\.\d{3})*,\d{2}$/
const CURRENCY_RE = /^[A-Z]{3}$/
const INSTALLMENT_RE = /\((\d+\/\d+)\)\s*$/
const MEMBERSHIP_RE = /članarin/iu
const SUMMARY_RE = /^(ukupno|sveukupno)\b/iu

type CategorizeFn = (description: string) => string

export function isErsteStatement(lines: TextLine[]): boolean {
  return lines.some((line) => /Obavijest o troškovima|Specifikacija troškova/u.test(lineText(line)))
}

function isoDate(raw: string): string | null {
  const match = raw.match(DATE_RE)
  if (!match) return null
  const [, dd, mm, yy] = match
  return `20${yy}-${mm}-${dd}`
}

function cellIn(line: TextLine, min: number, max: number): TextCell | undefined {
  return line.find((cell) => cell.x >= min && cell.x < max)
}

function amountCell(line: TextLine): TextCell | undefined {
  const amounts = line.filter((cell) => cell.x >= COL.amountMin)
  return amounts[amounts.length - 1]
}

function isTransactionStart(line: TextLine): boolean {
  const [date, id1] = line
  return (
    date != null &&
    id1 != null &&
    date.x < COL.dateMax &&
    DATE_RE.test(date.text) &&
    id1.x < COL.id1Max &&
    ID_RE.test(id1.text)
  )
}

function continuationText(line: TextLine): string | null {
  const first = line[0]
  if (!first || first.x < COL.descMin || first.x >= COL.descMax) return null
  if (amountCell(line)) return null
  const text = lineText(line).split(';')[0]!.trim()
  if (!text || /^\d/.test(text) || SUMMARY_RE.test(text)) return null
  return text
}

export function parseErsteCardClubLines(
  lines: TextLine[],
  categorize: CategorizeFn = categorizeDescription,
): ImportParseResult {
  const skipped: ImportSkipped = {}
  const drafts: ParsedImportRowDraft[] = []
  let current: ParsedImportRowDraft | null = null

  for (const line of lines) {
    if (!isTransactionStart(line)) {
      const extra = current ? continuationText(line) : null
      if (current && extra) {
        current.merchant = `${current.merchant} ${extra}`
      } else {
        current = null
      }
      continue
    }

    current = null
    const date = isoDate(line[0]!.text)
    const externalId = line[1]!.text
    const desc = cellIn(line, COL.descMin, COL.descMax)
    const amount = amountCell(line)

    if (desc && AMOUNT_RE.test(desc.text)) {
      countSkip(skipped, 'payment')
      continue
    }
    if (!date || !desc || !amount) {
      countSkip(skipped, 'unparseable')
      continue
    }

    let amountCents: number
    try {
      amountCents = parseHrAmount(amount.text)
    } catch {
      countSkip(skipped, 'unparseable')
      continue
    }
    if (amountCents === 0) continue

    const notes: string[] = []
    const installment = desc.text.match(INSTALLMENT_RE)
    if (installment) notes.push(`rata ${installment[1]}`)

    const currency = cellIn(line, COL.descMax, COL.currencyMax)
    if (currency && CURRENCY_RE.test(currency.text) && currency.text !== 'EUR') {
      const original = cellIn(line, COL.currencyMax, COL.amountMin)
      if (original) notes.push(`${original.text} ${currency.text}`)
    }

    current = {
      date,
      amountCents,
      merchant: desc.text,
      source: 'kartica',
      category: 'other',
      note: notes.length > 0 ? notes.join(', ') : undefined,
      externalId,
    }
    drafts.push(current)
  }

  for (const draft of drafts) {
    draft.merchant = draft.merchant.replace(/\s+/g, ' ').trim()
    draft.category = MEMBERSHIP_RE.test(draft.merchant) ? 'other' : categorize(draft.merchant)
  }

  return { rows: assignImportHashes(drafts), skipped }
}
