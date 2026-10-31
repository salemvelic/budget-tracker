import Papa from 'papaparse'

import { categorizeDescription } from '@/domain/categorize'
import type { TxnSource } from '@/db'

export interface ParsedImportRow {
  date: string
  amountCents: number
  merchant: string
  source: TxnSource
  category: string
  importHash: string
}

export function buildImportHash(date: string, amountCents: number, merchant: string): string {
  return `${date}|${amountCents}|${merchant.trim().toLowerCase()}`
}

function parseRevolutAmountCents(raw: string): number | null {
  const normalized = raw.trim().replace(',', '.')
  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value) || value >= 0) return null
  return Math.round(Math.abs(value) * 100)
}

function parseRevolutDate(raw: string): string | null {
  const trimmed = raw.trim()
  if (trimmed.length < 10) return null
  const iso = trimmed.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(iso) ? iso : null
}

type CategorizeFn = (description: string) => string

export function parseRevolutCsv(
  csvText: string,
  categorize: CategorizeFn = categorizeDescription,
): ParsedImportRow[] {
  const { data, errors } = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (errors.length > 0) {
    throw new Error('csv.invalid')
  }

  const rows: ParsedImportRow[] = []

  for (const row of data) {
    if ((row.State ?? '').trim().toUpperCase() !== 'COMPLETED') continue

    const date = parseRevolutDate(row['Completed Date'] ?? row['Started Date'] ?? '')
    const amountCents = parseRevolutAmountCents(row.Amount ?? '')
    const merchant = (row.Description ?? '').trim()

    if (!date || amountCents == null || !merchant) continue

    const category = categorize(merchant)
    rows.push({
      date,
      amountCents,
      merchant,
      source: 'revolut',
      category,
      importHash: buildImportHash(date, amountCents, merchant),
    })
  }

  return rows
}
