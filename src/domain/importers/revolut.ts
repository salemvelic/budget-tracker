import Papa from 'papaparse'

import { categorizeDescription } from '@/domain/categorize'
import { parseHrAmount } from '@/domain/money'
import {
  assignImportHashes,
  countSkip,
  type ImportParseResult,
  type ImportSkipped,
  type ParsedImportRowDraft,
} from '@/domain/importers/types'

const REQUIRED_COLUMNS = ['Type', 'State', 'Amount', 'Description'] as const
const SPEND_TYPES = new Set(['CARD_PAYMENT', 'FEE'])
const REFUND_TYPES = new Set(['CARD_REFUND'])
const CASH_TYPES = new Set(['ATM'])

type CategorizeFn = (description: string) => string

function parseRevolutDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length < 10) return null
  const iso = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null
}

function parseFeeCents(feeRaw: string | undefined): number {
  if (!feeRaw?.trim()) return 0
  try {
    return Math.abs(parseHrAmount(feeRaw))
  } catch {
    return 0
  }
}

function amountCentsForRow(type: string, amountRaw: string, feeRaw: string | undefined): number | null {
  try {
    const amountCents = parseHrAmount(amountRaw)
    if (SPEND_TYPES.has(type)) {
      return amountCents < 0 ? Math.abs(amountCents) + parseFeeCents(feeRaw) : null
    }
    if (REFUND_TYPES.has(type)) {
      return amountCents > 0 ? -amountCents : null
    }
    return null
  } catch {
    return null
  }
}

function assertRevolutHeaders(fields: string[] | undefined): void {
  if (!fields || REQUIRED_COLUMNS.some((column) => !fields.includes(column))) {
    throw new Error('csv.notRevolut')
  }
}

export function parseRevolutCsv(
  csvText: string,
  categorize: CategorizeFn = categorizeDescription,
): ImportParseResult {
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    throw new Error('csv.invalid')
  }
  assertRevolutHeaders(meta.fields)

  const skipped: ImportSkipped = {}
  const drafts: ParsedImportRowDraft[] = []

  for (const row of data) {
    if ((row.State ?? '').trim().toUpperCase() !== 'COMPLETED') {
      countSkip(skipped, 'pending')
      continue
    }
    if ((row.Currency ?? 'EUR').trim().toUpperCase() !== 'EUR') {
      countSkip(skipped, 'foreignCurrency')
      continue
    }

    const type = (row.Type ?? '').trim().toUpperCase()
    if (CASH_TYPES.has(type)) {
      countSkip(skipped, 'cash')
      continue
    }
    if (!SPEND_TYPES.has(type) && !REFUND_TYPES.has(type)) {
      countSkip(skipped, 'transfer')
      continue
    }

    const date = parseRevolutDate(row['Completed Date'] ?? row['Started Date'] ?? '')
    const merchant = (row.Description ?? '').trim()
    const amountCents = amountCentsForRow(type, row.Amount ?? '', row.Fee)

    if (!date || !merchant || amountCents == null || amountCents === 0) {
      countSkip(skipped, 'unparseable')
      continue
    }

    drafts.push({
      date,
      amountCents,
      merchant,
      source: 'revolut',
      category: categorize(merchant),
    })
  }

  return { rows: assignImportHashes(drafts), skipped }
}
