import { db } from '@/db'

export async function deleteTxn(id: number): Promise<void> {
  await db.transaction('rw', db.txns, db.ignoredImports, async () => {
    const txn = await db.txns.get(id)
    if (txn?.importHash) {
      await db.ignoredImports.put({ importHash: txn.importHash })
    }
    await db.txns.delete(id)
  })
}
