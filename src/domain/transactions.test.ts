import { describe, expect, it } from 'vitest'

import { monthTotalCents, totalsByCategory, validateTxnInput } from './transactions'

describe('validateTxnInput', () => {
  it('accepts valid input', () => {
    expect(
      validateTxnInput({
        date: '2026-10-15',
        amountCents: 1250,
        merchant: 'Demo shop',
        source: 'kartica',
        category: 'food',
      }),
    ).toMatchObject({ merchant: 'Demo shop' })
  })

  it('rejects invalid date', () => {
    expect(() =>
      validateTxnInput({
        date: '15-10-2026',
        amountCents: 100,
        merchant: 'Demo',
        source: 'gotovina',
        category: 'other',
      }),
    ).toThrow('Invalid date')
  })
})

describe('monthTotalCents', () => {
  it('sums transaction amounts', () => {
    expect(
      monthTotalCents([
        { amountCents: 1000 },
        { amountCents: 2500 },
        { amountCents: -500 },
      ]),
    ).toBe(3000)
  })
})

describe('totalsByCategory', () => {
  it('groups by category id', () => {
    expect(
      totalsByCategory([
        { amountCents: 1000, category: 'food' },
        { amountCents: 500, category: 'food' },
        { amountCents: 2000, category: 'fuel' },
      ]),
    ).toEqual({ food: 1500, fuel: 2000 })
  })
})
