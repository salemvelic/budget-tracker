import { describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES } from './categories'
import { recurringPayments, recurringTotalCents } from './recurring'

const categories = DEFAULT_CATEGORIES

describe('recurringPayments', () => {
  const selected = '2026-10'

  it('includes a steady subscription seen in two prior months', () => {
    const list = recurringPayments(
      [
        {
          date: '2026-09-05',
          amountCents: 999,
          merchant: 'Demo Stream',
          category: 'subscriptions',
          note: undefined,
        },
        {
          date: '2026-08-05',
          amountCents: 999,
          merchant: 'Demo Stream',
          category: 'subscriptions',
          note: undefined,
        },
        {
          date: '2026-10-05',
          amountCents: 999,
          merchant: 'Demo Stream',
          category: 'subscriptions',
          note: undefined,
        },
      ],
      selected,
      categories,
    )
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({ merchant: 'demo stream', typicalCents: 999, paid: true })
  })

  it('uses median when amounts vary', () => {
    const list = recurringPayments(
      [
        { date: '2026-09-01', amountCents: 4000, merchant: 'Demo Utility', category: 'utilities' },
        { date: '2026-08-01', amountCents: 6000, merchant: 'Demo Utility', category: 'utilities' },
      ],
      selected,
      categories,
    )
    expect(list[0]?.typicalCents).toBe(5000)
  })

  it('excludes one-off purchases', () => {
    const list = recurringPayments(
      [{ date: '2026-09-01', amountCents: 5000, merchant: 'Once Shop', category: 'shopping' }],
      selected,
      categories,
    )
    expect(list).toHaveLength(0)
  })

  it('excludes income', () => {
    const list = recurringPayments(
      [
        { date: '2026-09-01', amountCents: 50000, merchant: 'Salary', category: 'income' },
        { date: '2026-08-01', amountCents: 50000, merchant: 'Salary', category: 'income' },
      ],
      selected,
      categories,
    )
    expect(list).toHaveLength(0)
  })
})

describe('recurringTotalCents', () => {
  it('sums typical amounts', () => {
    expect(
      recurringTotalCents([
        { merchant: 'a', typicalCents: 100, paidThisMonthCents: 100, paid: true },
        { merchant: 'b', typicalCents: 250, paidThisMonthCents: 0, paid: false },
      ]),
    ).toBe(350)
  })
})
