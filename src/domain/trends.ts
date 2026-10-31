import type { Category, Txn } from '@/db'
import { rollupTotals } from '@/domain/categories'
import { monthRange, shiftMonth } from '@/domain/month'
import { totalsByCategory } from '@/domain/transactions'

export interface MonthCategoryTotals {
  totals: Record<string, number>
  hasData: boolean
}

export interface CategoryTrend {
  lastMonthCents: number
  avg3Cents: number
}

/** Rolled-up totals for the three months before selectedMonth (newest first). */
export function previousMonthTotals(
  txns: Pick<Txn, 'date' | 'amountCents' | 'category'>[],
  selectedMonth: string,
  categories: Category[],
  excludeCategoryIds: Set<string>,
): [MonthCategoryTotals, MonthCategoryTotals, MonthCategoryTotals] {
  return [
    shiftMonth(selectedMonth, -1),
    shiftMonth(selectedMonth, -2),
    shiftMonth(selectedMonth, -3),
  ].map((ym) => {
    const { start, end } = monthRange(ym)
    const monthTxns = txns.filter((txn) => txn.date >= start && txn.date <= end)
    const rolled = rollupTotals(totalsByCategory(monthTxns), categories)
    for (const id of Object.keys(rolled)) {
      if (excludeCategoryIds.has(id)) delete rolled[id]
    }
    return { totals: rolled, hasData: monthTxns.length > 0 }
  }) as [MonthCategoryTotals, MonthCategoryTotals, MonthCategoryTotals]
}

/** Round up to the next 10 EUR; 0 when there is no average spend. */
export function suggestedBudgetCents(avg3Cents: number): number {
  if (avg3Cents <= 0) return 0
  return Math.ceil(avg3Cents / 1000) * 1000
}

/** Compare current month category totals to the previous month and a 3-month average. */
export function categoryTrends(
  currentTotals: Record<string, number>,
  previousMonths: [MonthCategoryTotals, MonthCategoryTotals, MonthCategoryTotals],
): Record<string, CategoryTrend> {
  const ids = new Set<string>([
    ...Object.keys(currentTotals),
    ...previousMonths.flatMap((month) => Object.keys(month.totals)),
  ])
  const result: Record<string, CategoryTrend> = {}
  for (const id of ids) {
    const lastMonthCents = previousMonths[0]?.totals[id] ?? 0
    const withData = previousMonths.filter((month) => month.hasData)
    const sum = withData.reduce((acc, month) => acc + (month.totals[id] ?? 0), 0)
    const avg3Cents = withData.length > 0 ? Math.round(sum / withData.length) : 0
    result[id] = { lastMonthCents, avg3Cents }
  }
  return result
}

export function spendingAboveAverage(
  currentCents: number,
  avg3Cents: number,
  threshold = 1.2,
): boolean {
  if (avg3Cents <= 0) return false
  return currentCents > avg3Cents * threshold
}
