import { describe, expect, it } from 'vitest'

import type { Category } from '@/db'

import { monthPlan } from './plan'

const categories: Category[] = [
  { id: 'food', nameKey: 'categories.food', budgetCents: 40000 },
  { id: 'loans', nameKey: 'categories.loans', budgetCents: 50000, kind: 'fixed' },
  { id: 'savings', nameKey: 'categories.savings', kind: 'savings' },
  { id: 'other', nameKey: 'categories.other' },
]

describe('monthPlan', () => {
  it('computes savings rate from income and savings totals', () => {
    const withIncome: Category[] = [
      ...categories,
      { id: 'income', nameKey: 'categories.income', kind: 'income' },
    ]
    const plan = monthPlan(withIncome, { food: 10000, savings: 3000, income: 50000 }, 60000)
    expect(plan.incomeCents).toBe(50000)
    expect(plan.savingsRate).toBeCloseTo(0.06)
    expect(plan.spentCents).toBe(10000)
  })

  it('uses the sum of category limits and reserves fixed costs before they are debited', () => {
    const plan = monthPlan(categories, { food: 10000, other: 5000, savings: 3000 }, 60000)
    expect(plan).toMatchObject({
      limitCents: 90000,
      usesCategoryBudgets: true,
      spentCents: 15000,
      fixedSpentCents: 0,
      variableSpentCents: 15000,
      fixedReservedCents: 50000,
      remainingCents: 75000,
      flexibleLeftCents: 25000,
      savedCents: 3000,
    })
  })

  it('reserves the actual amount when a fixed cost exceeds its limit', () => {
    const plan = monthPlan(categories, { loans: 55000 }, 60000)
    expect(plan.fixedReservedCents).toBe(55000)
    expect(plan.flexibleLeftCents).toBe(35000)
  })

  it('counts subcategory spending toward the parent and ignores child limits', () => {
    const withChildren: Category[] = [
      ...categories,
      { id: 'groceries', nameKey: 'categories.groceries', parentId: 'food', budgetCents: 99999 },
      { id: 'mortgage', nameKey: 'x', parentId: 'loans' },
    ]
    const plan = monthPlan(withChildren, { groceries: 10000, mortgage: 52000 }, 60000)
    expect(plan.limitCents).toBe(90000)
    expect(plan.fixedSpentCents).toBe(52000)
    expect(plan.fixedReservedCents).toBe(52000)
    expect(plan.variableSpentCents).toBe(10000)
  })

  it('falls back to the global monthly limit without category limits', () => {
    const plain = categories.map((category) => ({ ...category, budgetCents: undefined }))
    const plan = monthPlan(plain, { food: 10000, loans: 20000, unknown: 500 }, 60000)
    expect(plan.limitCents).toBe(60000)
    expect(plan.usesCategoryBudgets).toBe(false)
    expect(plan.fixedReservedCents).toBe(20000)
    expect(plan.variableSpentCents).toBe(10500)
    expect(plan.flexibleLeftCents).toBe(29500)
  })
})
