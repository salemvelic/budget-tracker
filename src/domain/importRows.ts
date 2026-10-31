import { db } from '@/db'
import type { ParsedImportRow } from '@/domain/importers/revolut'

export async function filterNewImportRows(rows: ParsedImportRow[]): Promise<ParsedImportRow[]> {
  if (rows.length === 0) return []
  const hashes = rows.map((row) => row.importHash)
  const existing = await db.txns.where('importHash').anyOf(hashes).toArray()
  const existingSet = new Set(existing.map((txn) => txn.importHash))
  return rows.filter((row) => !existingSet.has(row.importHash))
}

export async function importParsedRows(rows: ParsedImportRow[]): Promise<number> {
  const toAdd = await filterNewImportRows(rows)
  if (toAdd.length === 0) return 0
  await db.txns.bulkAdd(toAdd)
  return toAdd.length
}
