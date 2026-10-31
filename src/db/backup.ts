import { db } from '@/db'
import type { BackupData } from '@/domain/backup'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { applyDataFixes } from '@/db/migrations'

export async function readBackupData(): Promise<BackupData> {
  const [txns, rules, categories, settings, ignoredImports] = await Promise.all([
    db.txns.toArray(),
    db.rules.toArray(),
    db.categories.toArray(),
    db.settings.toArray(),
    db.ignoredImports.toArray(),
  ])
  return { txns, rules, categories, settings, ignoredImports }
}

/** Replace all local data with the backup contents in one transaction. */
export async function restoreBackupData(data: BackupData): Promise<void> {
  const tables = [db.txns, db.rules, db.categories, db.settings, db.ignoredImports]
  await db.transaction('rw', tables, async (tx) => {
    await Promise.all(tables.map((table) => table.clear()))
    await db.txns.bulkAdd(data.txns)
    await db.rules.bulkAdd(data.rules)
    await db.categories.bulkAdd(data.categories)
    const restored = new Set(data.categories.map((category) => category.id))
    await db.categories.bulkAdd(DEFAULT_CATEGORIES.filter((category) => !restored.has(category.id)))
    await db.settings.bulkAdd(data.settings)
    await db.ignoredImports.bulkAdd(data.ignoredImports)
    await applyDataFixes(tx)
  })
}
