import type { Txn, TxnSource } from '@/db'
import { isSameMerchant } from '@/domain/categorize'

export interface TxnInput {
  date: string
  amountCents: number
  merchant: string
  source: TxnSource
  category: string
  note?: string
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function validateTxnInput(input: TxnInput): TxnInput {
  if (!ISO_DATE.test(input.date)) {
    throw new Error('date.invalid')
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
    throw new Error('amount.invalid')
  }
  if (!input.merchant.trim()) {
    throw new Error('merchant.empty')
  }
  if (!input.category.trim()) {
    throw new Error('category.empty')
  }
  return {
    ...input,
    merchant: input.merchant.trim(),
    note: input.note?.trim() || undefined,
  }
}

export function monthTotalCents(txns: Pick<Txn, 'amountCents'>[]): number {
  return txns.reduce((sum, txn) => sum + txn.amountCents, 0)
}

export function totalsByCategory(
  txns: Pick<Txn, 'amountCents' | 'category'>[],
): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const txn of txns) {
    totals[txn.category] = (totals[txn.category] ?? 0) + txn.amountCents
  }
  return totals
}

export function txnsInCategory(
  txns: Pick<Txn, 'id' | 'date' | 'amountCents' | 'merchant' | 'source' | 'category' | 'note'>[],
  categoryId: string,
): Pick<Txn, 'id' | 'date' | 'amountCents' | 'merchant' | 'source' | 'category' | 'note'>[] {
  return txns
    .filter((txn) => txn.category === categoryId)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0))
}

type TxnMerchantSlice = Pick<
  Txn,
  'id' | 'date' | 'amountCents' | 'merchant' | 'source' | 'category' | 'note'
>

export interface MerchantTotal {
  merchant: string
  cents: number
  txns: TxnMerchantSlice[]
}

export function totalsByMerchant(txns: TxnMerchantSlice[]): MerchantTotal[] {
  const groups: { merchant: string; txns: TxnMerchantSlice[] }[] = []
  for (const txn of txns) {
    const group = groups.find((item) => isSameMerchant(item.merchant, txn.merchant))
    if (group) group.txns.push(txn)
    else groups.push({ merchant: txn.merchant, txns: [txn] })
  }
  return groups
    .map((group) => ({
      merchant: group.merchant,
      cents: group.txns.reduce((sum, txn) => sum + txn.amountCents, 0),
      txns: [...group.txns].sort(
        (a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0),
      ),
    }))
    .sort((a, b) => b.cents - a.cents)
}
