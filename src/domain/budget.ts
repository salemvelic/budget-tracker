import type { Category } from '@/db'

export interface CategoryBudgetStatus {
  id: string
  nameKey: string
  budgetCents: number | null
  spentCents: number
  remainingCents: number | null
  /** Spent share of the budget in percent, capped at 100 for display. */
  percent: number
  over: boolean
}

export function budgetStatus(
  categories: Category[],
  spentByCategory: Record<string, number>,
): CategoryBudgetStatus[] {
  return categories.map((category) => {
    const spentCents = spentByCategory[category.id] ?? 0
    const budgetCents =
      category.budgetCents && category.budgetCents > 0 ? category.budgetCents : null
    const remainingCents = budgetCents == null ? null : budgetCents - spentCents
    const percent =
      budgetCents == null
        ? 0
        : Math.min(100, Math.max(0, Math.round((spentCents / budgetCents) * 100)))
    return {
      id: category.id,
      nameKey: category.nameKey,
      budgetCents,
      spentCents,
      remainingCents,
      percent,
      over: remainingCents != null && remainingCents < 0,
    }
  })
}

export function totalBudgetCents(categories: Category[]): number {
  return categories.reduce((sum, category) => sum + (category.budgetCents ?? 0), 0)
}
