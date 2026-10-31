export interface MonthCategoryTotals {
  totals: Record<string, number>
  hasData: boolean
}

export interface CategoryTrend {
  lastMonthCents: number
  avg3Cents: number
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
