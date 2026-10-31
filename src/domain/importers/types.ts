import type { TxnSource } from '@/db'

export interface ParsedImportRow {
  date: string
  amountCents: number
  merchant: string
  source: TxnSource
  category: string
  importHash: string
}

export type ParsedImportRowDraft = Omit<ParsedImportRow, 'importHash'>

function hashBaseKey(row: ParsedImportRowDraft): string {
  return `${row.source}|${row.date}|${row.amountCents}|${row.merchant.trim().toLowerCase()}`
}

/** Assign stable importHash values; duplicate purchases same day get #0, #1, … */
export function assignImportHashes(rows: ParsedImportRowDraft[]): ParsedImportRow[] {
  const occurrence = new Map<string, number>()
  return rows.map((row) => {
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
