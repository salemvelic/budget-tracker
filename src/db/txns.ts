import { db, type Txn, type TxnSource } from '@/db'
import { IMPORT_SOURCES } from '@/domain/coverage'
import { isSameMerchant, merchantRulePattern } from '@/domain/categorize'

export async function deleteTxn(id: number): Promise<void> {
  await db.transaction('rw', db.txns, db.ignoredImports, async () => {
    const txn = await db.txns.get(id)
    if (txn?.importHash) {
      await db.ignoredImports.put({ importHash: txn.importHash })
    }
    await db.txns.delete(id)
  })
}

/**
 * Sets the category of one transaction. With `remember`, also saves a rule for the merchant
 * and moves the merchant's other transactions; returns how many others changed.
 */
export async function recategorizeTxn(
  txn: Txn,
  category: string,
  remember: boolean,
): Promise<number> {
  if (txn.id == null) return 0
  const id = txn.id
  return db.transaction('rw', db.txns, db.rules, async () => {
    await db.txns.update(id, { category })
    if (!remember) return 0

    const pattern = merchantRulePattern(txn.merchant)
    const existing = await db.rules.where('pattern').equals(pattern).first()
    if (existing?.id != null) await db.rules.update(existing.id, { category })
    else await db.rules.add({ pattern, category })

    const others = await db.txns
      .filter(
        (other) =>
          other.id !== id &&
          other.category !== category &&
          isSameMerchant(other.merchant, txn.merchant),
      )
      .toArray()
    for (const other of others) await db.txns.update(other.id!, { category })
    return others.length
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
