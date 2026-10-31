import { db } from '@/db'
import type { ParsedImportRow } from '@/domain/importers/types'
import { dedupeWithinBatch } from '@/domain/importers/types'

export async function filterNewImportRows(rows: ParsedImportRow[]): Promise<ParsedImportRow[]> {
  const unique = dedupeWithinBatch(rows)
  if (unique.length === 0) return []
  const hashes = unique.map((row) => row.importHash)
  const existing = await db.txns.where('importHash').anyOf(hashes).toArray()
  const existingSet = new Set(existing.map((txn) => txn.importHash))
  return unique.filter((row) => !existingSet.has(row.importHash))
}

export async function importParsedRows(rows: ParsedImportRow[]): Promise<number> {
  const toAdd = await filterNewImportRows(rows)
  if (toAdd.length === 0) return 0
  await db.txns.bulkAdd(toAdd)
  return toAdd.length
}
