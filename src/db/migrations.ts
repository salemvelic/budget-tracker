import type { Transaction } from 'dexie'

import type { Category, SettingRow, Txn } from '@/db'
import { DEFAULT_CATEGORIES } from '@/domain/categories'
import { subcategoryUpgrade } from '@/domain/categorize'

/** Align categories and transaction categories after restore or schema upgrade. */
export async function applyDataFixes(tx: Transaction): Promise<void> {
  const categories = tx.table<Category, string>('categories')
  const known = new Set(await categories.toCollection().primaryKeys())
  await categories.bulkPut(DEFAULT_CATEGORIES.filter((category) => !known.has(category.id)))

  for (const def of DEFAULT_CATEGORIES) {
    const existing = await categories.get(def.id)
    if (!existing) continue
    const patch: Partial<Category> = {}
    if (def.parentId && !existing.parentId) patch.parentId = def.parentId
    if (def.kind && !existing.kind) patch.kind = def.kind
    if (Object.keys(patch).length > 0) await categories.update(def.id, patch)
  }

  await tx
    .table<Txn, number>('txns')
    .toCollection()
    .modify((txn) => {
      const next = subcategoryUpgrade(txn)
      if (next) txn.category = next
    })
}

export async function resetUntouchedDefaultLimit(tx: Transaction): Promise<void> {
  const settings = tx.table<SettingRow, string>('settings')
  const row = await settings.get('monthlyLimitCents')
  if (row?.value === '60000') await settings.put({ key: 'monthlyLimitCents', value: '0' })
}
