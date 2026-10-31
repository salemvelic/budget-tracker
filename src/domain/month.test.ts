import { describe, expect, it } from 'vitest'

import { dailyAllowanceCents, daysLeftInMonth, monthKey, monthRange } from './month'

describe('monthKey', () => {
  it('returns yyyy-mm', () => {
    expect(monthKey(new Date(2026, 9, 31))).toBe('2026-10')
  })
})

describe('monthRange', () => {
  it('covers full calendar month', () => {
    expect(monthRange('2026-02')).toEqual({ start: '2026-02-01', end: '2026-02-28' })
  })

  it('handles leap year February', () => {
    expect(monthRange('2024-02')).toEqual({ start: '2024-02-01', end: '2024-02-29' })
  })
})

describe('daysLeftInMonth', () => {
  it('includes today', () => {
    expect(daysLeftInMonth(new Date(2026, 9, 31))).toBe(1)
  })

  it('counts from first day of month', () => {
    expect(daysLeftInMonth(new Date(2026, 9, 1))).toBe(31)
  })
})

describe('dailyAllowanceCents', () => {
  it('splits remaining budget across days left', () => {
    expect(dailyAllowanceCents(70_000, 0, new Date(2026, 9, 31))).toBe(70_000)
  })

  it('never divides by zero', () => {
    expect(dailyAllowanceCents(10_000, 5_000, new Date(2026, 9, 31))).toBe(5_000)
  })
})
