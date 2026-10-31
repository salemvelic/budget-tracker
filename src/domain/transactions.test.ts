import { describe, expect, it } from 'vitest'

import {
  monthTotalCents,
  totalsByCategory,
  totalsByMerchant,
  txnsInCategory,
  validateTxnInput,
} from './transactions'

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
    ).toThrow('date.invalid')
  })
})

describe('monthTotalCents', () => {
  it('sums transaction amounts', () => {
    expect(
      monthTotalCents([{ amountCents: 1000 }, { amountCents: 2500 }, { amountCents: -500 }]),
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

describe('txnsInCategory', () => {
  const txns = [
    {
      id: 1,
      date: '2026-10-01',
      amountCents: 1000,
      merchant: 'Demo A',
      source: 'kartica' as const,
      category: 'groceries',
    },
    {
      id: 2,
      date: '2026-10-15',
      amountCents: 500,
      merchant: 'Demo B',
      source: 'revolut' as const,
      category: 'groceries',
    },
    {
      id: 3,
      date: '2026-10-10',
      amountCents: 2000,
      merchant: 'Demo C',
      source: 'kartica' as const,
      category: 'fuel',
    },
  ]

  it('returns only matching category', () => {
    expect(txnsInCategory(txns, 'groceries')).toHaveLength(2)
    expect(txnsInCategory(txns, 'fuel')).toHaveLength(1)
    expect(txnsInCategory(txns, 'other')).toEqual([])
  })

  it('sorts by date desc then id desc', () => {
    expect(txnsInCategory(txns, 'groceries').map((t) => t.id)).toEqual([2, 1])
  })
})

describe('totalsByMerchant', () => {
  it('groups merchants case-insensitively and sorts by total', () => {
    const result = totalsByMerchant([
      {
        id: 1,
        date: '2026-10-01',
        amountCents: 100,
        merchant: 'Demo Portfolio',
        source: 'revolut',
        category: 'savings',
      },
      {
        id: 2,
        date: '2026-10-05',
        amountCents: 200,
        merchant: 'demo portfolio',
        source: 'revolut',
        category: 'savings',
      },
      {
        id: 3,
        date: '2026-10-03',
        amountCents: 500,
        merchant: 'Demo Invest',
        source: 'revolut',
        category: 'savings',
      },
    ])
    expect(result).toHaveLength(2)
    expect(result[0]?.merchant).toBe('Demo Invest')
    expect(result[0]?.cents).toBe(500)
    expect(result[1]?.cents).toBe(300)
    expect(result[1]?.txns.map((t) => t.id)).toEqual([2, 1])
  })

  it('returns empty for no transactions', () => {
    expect(totalsByMerchant([])).toEqual([])
  })
})
