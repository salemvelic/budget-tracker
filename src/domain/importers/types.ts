import type { TxnSource } from '@/db'

export interface ParsedImportRow {
  date: string
  amountCents: number
  merchant: string
  source: TxnSource
  category: string
  note?: string
  importHash: string
}

export type ParsedImportRowDraft = Omit<ParsedImportRow, 'importHash'> & {
  /** Statement-provided transaction id; when present it alone identifies the row. */
  externalId?: string
}

export type SkipReason =
  | 'pending'
  | 'reversed'
  | 'foreignCurrency'
  | 'transfer'
  | 'cash'
  | 'payment'
  | 'unparseable'

export type ImportSkipped = Partial<Record<SkipReason, number>>

export interface ImportParseResult {
  rows: ParsedImportRow[]
  skipped: ImportSkipped
}

export function countSkip(skipped: ImportSkipped, reason: SkipReason): void {
  skipped[reason] = (skipped[reason] ?? 0) + 1
}

/** One text fragment of a PDF line with its left x-coordinate. */
export interface TextCell {
  x: number
  text: string
}

export type TextLine = TextCell[]

function hashBaseKey(row: ParsedImportRowDraft): string {
  return `${row.source}|${row.date}|${row.amountCents}|${row.merchant.trim().toLowerCase()}`
}

/** Stable importHash per row; same-day identical purchases without an id get #0, #1, … */
export function assignImportHashes(rows: ParsedImportRowDraft[]): ParsedImportRow[] {
  const occurrence = new Map<string, number>()
  return rows.map(({ externalId, ...row }) => {
    if (externalId) {
      return { ...row, importHash: `${row.source}|id:${externalId}` }
    }
    const base = hashBaseKey(row)
    const index = occurrence.get(base) ?? 0
    occurrence.set(base, index + 1)
    return { ...row, importHash: `${base}|#${index}` }
  })
}

export function dedupeWithinBatch(rows: ParsedImportRow[]): ParsedImportRow[] {
  const seen = new Set<string>()
  return rows.filter((row) => {
    if (seen.has(row.importHash)) return false
    seen.add(row.importHash)
    return true
  })
}
