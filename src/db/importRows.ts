import { db } from '@/db'
import { dedupeWithinBatch, type ParsedImportRow } from '@/domain/importers/types'

export async function filterNewImportRows(rows: ParsedImportRow[]): Promise<ParsedImportRow[]> {
  const unique = dedupeWithinBatch(rows)
  if (unique.length === 0) return []
  const hashes = unique.map((row) => row.importHash)
  const [existing, ignored] = await Promise.all([
    db.txns.where('importHash').anyOf(hashes).toArray(),
    db.ignoredImports.where('importHash').anyOf(hashes).toArray(),
  ])
  const known = new Set([...existing.map((txn) => txn.importHash), ...ignored.map((row) => row.importHash)])
  return unique.filter((row) => !known.has(row.importHash))
}

export async function importParsedRows(rows: ParsedImportRow[]): Promise<number> {
  const toAdd = await filterNewImportRows(rows)
  if (toAdd.length === 0) return 0
  await db.txns.bulkAdd(toAdd)
  return toAdd.length
}
