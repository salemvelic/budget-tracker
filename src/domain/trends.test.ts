import { describe, expect, it } from 'vitest'

import { categoryTrends, spendingAboveAverage, suggestedBudgetCents } from './trends'

describe('categoryTrends', () => {
  it('averages only months that have data', () => {
    const trends = categoryTrends({ food: 12000 }, [
      { totals: { food: 10000 }, hasData: true },
      { totals: { food: 8000 }, hasData: false },
      { totals: { food: 6000 }, hasData: true },
    ])
    expect(trends.food).toEqual({ lastMonthCents: 10000, avg3Cents: 8000 })
  })
})

describe('spendingAboveAverage', () => {
  it('flags when current spend exceeds the threshold over the average', () => {
    expect(spendingAboveAverage(13000, 10000)).toBe(true)
    expect(spendingAboveAverage(11000, 10000)).toBe(false)
    expect(spendingAboveAverage(5000, 0)).toBe(false)
  })
})

describe('suggestedBudgetCents', () => {
  it('rounds up to the next 10 EUR', () => {
    expect(suggestedBudgetCents(0)).toBe(0)
    expect(suggestedBudgetCents(12300)).toBe(13000)
    expect(suggestedBudgetCents(10000)).toBe(10000)
  })
})
