import { describe, expect, it } from 'vitest'

import { budgetStatus, totalBudgetCents } from './budget'

const categories = [
  { id: 'food', nameKey: 'categories.food', budgetCents: 20000 },
  { id: 'fuel', nameKey: 'categories.fuel', budgetCents: 5000 },
  { id: 'other', nameKey: 'categories.other' },
]

describe('budgetStatus', () => {
  const [food, fuel, other] = budgetStatus(categories, { food: 5000, fuel: 6000, other: 1234 })

  it('computes remaining and percent', () => {
    expect(food).toMatchObject({
      spentCents: 5000,
      remainingCents: 15000,
      percent: 25,
      over: false,
    })
  })

  it('flags overspend and caps percent', () => {
    expect(fuel).toMatchObject({ remainingCents: -1000, percent: 100, over: true })
  })

  it('handles categories without a budget', () => {
    expect(other).toMatchObject({
      budgetCents: null,
      remainingCents: null,
      percent: 0,
      spentCents: 1234,
    })
  })

  it('does not go negative on net refunds', () => {
    expect(budgetStatus(categories, { food: -500 })[0]?.percent).toBe(0)
  })
})

describe('totalBudgetCents', () => {
  it('sums set budgets', () => {
    expect(totalBudgetCents(categories)).toBe(25000)
  })
})
