import type { Category } from '@/db'

export interface MonthPlan {
  /** Sum of category limits when any are set, otherwise the global monthly limit. */
  limitCents: number
  usesCategoryBudgets: boolean
  /** All spending (fixed + variable); savings are excluded. */
  spentCents: number
  fixedSpentCents: number
  variableSpentCents: number
  /** Fixed costs counted at least at their limit, so an instalment not yet debited is already set aside. */
  fixedReservedCents: number
  remainingCents: number
  /** What is left for variable spending after fixed costs are set aside. */
  flexibleLeftCents: number
  savedCents: number
}

export function monthPlan(
  categories: Category[],
  totalsByCategory: Record<string, number>,
  monthlyLimitCents: number,
): MonthPlan {
  const byId = new Map(categories.map((category) => [category.id, category]))

  let fixedSpentCents = 0
  let variableSpentCents = 0
  let savedCents = 0
  for (const [id, cents] of Object.entries(totalsByCategory)) {
    const kind = byId.get(id)?.kind
    if (kind === 'savings') savedCents += cents
    else if (kind === 'fixed') fixedSpentCents += cents
    else variableSpentCents += cents
  }

  const budgetSum = categories
    .filter((category) => category.kind !== 'savings')
    .reduce((sum, category) => sum + (category.budgetCents ?? 0), 0)
  const usesCategoryBudgets = budgetSum > 0
  const limitCents = usesCategoryBudgets ? budgetSum : monthlyLimitCents

  const fixedReservedCents = categories
    .filter((category) => category.kind === 'fixed')
    .reduce((sum, category) => sum + Math.max(category.budgetCents ?? 0, totalsByCategory[category.id] ?? 0), 0)

  const spentCents = fixedSpentCents + variableSpentCents
  return {
    limitCents,
    usesCategoryBudgets,
    spentCents,
    fixedSpentCents,
    variableSpentCents,
    fixedReservedCents,
    remainingCents: limitCents - spentCents,
    flexibleLeftCents: limitCents - fixedReservedCents - variableSpentCents,
    savedCents,
  }
}
