import Papa from 'papaparse'

import { categorizeDescription } from '@/domain/categorize'
import { parseHrAmount } from '@/domain/money'
import {
  assignImportHashes,
  type ParsedImportRow,
  type ParsedImportRowDraft,
} from '@/domain/importers/types'

const REQUIRED_COLUMNS = ['Type', 'State', 'Amount', 'Description'] as const
const SPEND_TYPES = new Set(['CARD_PAYMENT', 'FEE'])
const REFUND_TYPES = new Set(['CARD_REFUND'])

export interface RevolutParseSkipped {
  notCompleted: number
  otherType: number
  foreignCurrency: number
}

export interface RevolutParseResult {
  rows: ParsedImportRow[]
  skipped: RevolutParseSkipped
}

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
    const cents = parseHrAmount(feeRaw)
    return Math.abs(cents)
  } catch {
    return 0
  }
}

function amountCentsForRow(type: string, amountRaw: string, feeRaw: string | undefined): number | null {
  const trimmed = amountRaw.trim()
  if (!trimmed) return null

  try {
    const amountCents = parseHrAmount(trimmed)
    const feeCents = parseFeeCents(feeRaw)

    if (SPEND_TYPES.has(type)) {
      if (amountCents >= 0) return null
      return Math.abs(amountCents) + feeCents
    }
    if (REFUND_TYPES.has(type)) {
      if (amountCents <= 0) return null
      return -Math.abs(amountCents)
    }
    return null
  } catch {
    return null
  }
}

function assertRevolutHeaders(fields: string[] | undefined): void {
  if (!fields?.length) {
    throw new Error('csv.notRevolut')
  }
  for (const column of REQUIRED_COLUMNS) {
    if (!fields.includes(column)) {
      throw new Error('csv.notRevolut')
    }
  }
}

export function parseRevolutCsv(
  csvText: string,
  categorize: CategorizeFn = categorizeDescription,
): RevolutParseResult {
  const { data, errors, meta } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    throw new Error('csv.invalid')
  }

  assertRevolutHeaders(meta.fields)

  const skipped: RevolutParseSkipped = {
    notCompleted: 0,
    otherType: 0,
    foreignCurrency: 0,
  }
  const drafts: ParsedImportRowDraft[] = []

  for (const row of data) {
    const state = (row.State ?? '').trim().toUpperCase()
    if (state !== 'COMPLETED') {
      skipped.notCompleted += 1
      continue
    }

    const currency = (row.Currency ?? 'EUR').trim().toUpperCase()
    if (currency !== 'EUR') {
      skipped.foreignCurrency += 1
      continue
    }

    const type = (row.Type ?? '').trim().toUpperCase()
    if (!SPEND_TYPES.has(type) && !REFUND_TYPES.has(type)) {
      skipped.otherType += 1
      continue
    }

    const date = parseRevolutDate(row['Completed Date'] ?? row['Started Date'] ?? '')
    const merchant = (row.Description ?? '').trim()
    const amountCents = amountCentsForRow(type, row.Amount ?? '', row.Fee)

    if (!date || !merchant || amountCents == null || amountCents === 0) {
      skipped.otherType += 1
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
