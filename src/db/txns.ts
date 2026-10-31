import { db, type Txn, type TxnSource } from '@/db'
import { IMPORT_SOURCES } from '@/domain/coverage'
import { matchesCategoryPattern, txnDescription, validateRulePattern } from '@/domain/categorize'

export async function deleteTxn(id: number): Promise<void> {
  await db.transaction('rw', db.txns, db.ignoredImports, async () => {
    const txn = await db.txns.get(id)
    if (txn?.importHash) {
      await db.ignoredImports.put({ importHash: txn.importHash })
    }
    await db.txns.delete(id)
  })
}

/** Sets category and marks the transaction as manually categorised. */
export async function recategorizeTxn(txn: Txn, category: string): Promise<void> {
  if (txn.id == null) return
  await db.txns.update(txn.id, { category, categoryLocked: true })
}

/** Saves a rule and moves matching unlocked transactions; returns how many changed. */
export async function saveRuleAndApply(pattern: string, category: string): Promise<number> {
  const trimmed = pattern.trim()
  if (validateRulePattern(trimmed)) throw new Error('rule.invalid')

  return db.transaction('rw', db.txns, db.rules, async () => {
    const existing = await db.rules.where('pattern').equals(trimmed).first()
    if (existing?.id != null) await db.rules.update(existing.id, { category })
    else await db.rules.add({ pattern: trimmed, category })

    const toUpdate = await db.txns
      .filter(
        (txn) =>
          !txn.categoryLocked &&
          txn.category !== category &&
          matchesCategoryPattern(trimmed, txnDescription(txn)),
      )
      .toArray()
    for (const txn of toUpdate) await db.txns.update(txn.id!, { category })
    return toUpdate.length
  })
}

/** Latest transaction date per import source. */
export async function latestImportDates(): Promise<Partial<Record<TxnSource, string>>> {
  const latest: Partial<Record<TxnSource, string>> = {}
  await db.txns
    .orderBy('date')
    .reverse()
    .until(() => IMPORT_SOURCES.every((source) => latest[source]))
    .each((txn) => {
      if (txn.importHash && !latest[txn.source]) latest[txn.source] = txn.date
    })
  return latest
}
