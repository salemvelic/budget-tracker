import type { Txn, TxnSource } from '@/db'

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
    throw new Error('Invalid date')
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents === 0) {
    throw new Error('Invalid amountCents')
  }
  if (!input.merchant.trim()) {
    throw new Error('Invalid merchant')
  }
  if (!input.category.trim()) {
    throw new Error('Invalid category')
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

export function totalsByCategory(txns: Pick<Txn, 'amountCents' | 'category'>[]): Record<string, number> {
  const totals: Record<string, number> = {}
  for (const txn of txns) {
    totals[txn.category] = (totals[txn.category] ?? 0) + txn.amountCents
  }
  return totals
}
