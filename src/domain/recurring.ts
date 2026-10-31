import type { Category, Txn } from '@/db'
import { effectiveKind } from '@/domain/categories'
import { normalizeMerchant } from '@/domain/categorize'
import { monthRange, shiftMonth } from '@/domain/month'

export interface RecurringPayment {
  merchant: string
  typicalCents: number
  paidThisMonthCents: number
  paid: boolean
}

function groupKey(txn: Pick<Txn, 'merchant' | 'note'>): string {
  const merchant = normalizeMerchant(txn.merchant)
  const note = txn.note?.trim() ?? ''
  return note ? `${merchant}\0${note}` : merchant
}

function median(values: number[]): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2) : sorted[mid]!
}

function isSpendingTxn(
  txn: Pick<Txn, 'amountCents' | 'category'>,
  categories: Category[],
): boolean {
  if (txn.amountCents <= 0) return false
  const kind = effectiveKind(txn.category, categories)
  return kind !== 'savings' && kind !== 'income'
}

/** Merchants that appear in at least 2 of the 3 months before selectedMonth. */
export function recurringPayments(
  txns: Pick<Txn, 'date' | 'amountCents' | 'merchant' | 'note' | 'category'>[],
  selectedMonth: string,
  categories: Category[],
): RecurringPayment[] {
  const lookback = [
    shiftMonth(selectedMonth, -1),
    shiftMonth(selectedMonth, -2),
    shiftMonth(selectedMonth, -3),
  ]
  const { start: currentStart, end: currentEnd } = monthRange(selectedMonth)

  const monthKeys = new Map<string, Set<string>>()
  for (const ym of lookback) {
    monthKeys.set(ym, new Set())
  }

  const totalsByKeyMonth = new Map<string, Map<string, number>>()

  for (const txn of txns) {
    if (!isSpendingTxn(txn, categories)) continue
    const ym = txn.date.slice(0, 7)
    if (!monthKeys.has(ym)) continue
    const key = groupKey(txn)
    monthKeys.get(ym)!.add(key)
    const byMonth = totalsByKeyMonth.get(key) ?? new Map<string, number>()
    byMonth.set(ym, (byMonth.get(ym) ?? 0) + txn.amountCents)
    totalsByKeyMonth.set(key, byMonth)
  }

  const recurringKeys = [...totalsByKeyMonth.keys()].filter((key) => {
    let months = 0
    for (const ym of lookback) {
      if (monthKeys.get(ym)?.has(key)) months++
    }
    return months >= 2
  })

  const currentByKey = new Map<string, number>()
  for (const txn of txns) {
    if (!isSpendingTxn(txn, categories)) continue
    if (txn.date < currentStart || txn.date > currentEnd) continue
    const key = groupKey(txn)
    currentByKey.set(key, (currentByKey.get(key) ?? 0) + txn.amountCents)
  }

  const results: RecurringPayment[] = recurringKeys.map((key) => {
    const byMonth = totalsByKeyMonth.get(key)!
    const typicalCents = median([...byMonth.values()])
    const paidThisMonthCents = currentByKey.get(key) ?? 0
    const displayMerchant = key.includes('\0')
      ? `${key.split('\0')[0]!} (${key.split('\0')[1]})`
      : key
    return {
      merchant: displayMerchant,
      typicalCents,
      paidThisMonthCents,
      paid: paidThisMonthCents > 0,
    }
  })

  return results.sort((a, b) => b.typicalCents - a.typicalCents)
}

export function recurringTotalCents(list: RecurringPayment[]): number {
  return list.reduce((sum, item) => sum + item.typicalCents, 0)
}
