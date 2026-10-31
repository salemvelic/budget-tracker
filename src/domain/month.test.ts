import { describe, expect, it } from 'vitest'

import {
  dailyAllowanceCents,
  daysLeftInMonth,
  formatIsoDate,
  monthKey,
  monthRange,
  shiftMonth,
  todayIso,
} from './month'

describe('formatIsoDate', () => {
  it('formats in the requested locale without shifting the day', () => {
    expect(formatIsoDate('2026-10-31', 'hr')).toMatch(/^31\.\s?10\.\s?2026\.$/)
    expect(formatIsoDate('2026-01-02', 'en')).toBe('1/2/2026')
  })
})

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

describe('todayIso', () => {
  it('uses local calendar date', () => {
    expect(todayIso(new Date(2026, 9, 31, 23, 59, 0))).toBe('2026-10-31')
  })
})

describe('shiftMonth', () => {
  it('moves to next month', () => {
    expect(shiftMonth('2026-10', 1)).toBe('2026-11')
  })

  it('wraps across year boundary', () => {
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })

  it('moves to previous month', () => {
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
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
