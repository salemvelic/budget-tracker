import { describe, expect, it } from 'vitest'

import {
  DEFAULT_CATEGORIES,
  effectiveKind,
  isKnownCategoryId,
  orderedCategories,
  rollupTotals,
  spendingCategories,
  topLevelCategories,
  topLevelId,
} from './categories'

describe('DEFAULT_CATEGORIES', () => {
  it('has unique ids and only known parents', () => {
    const ids = DEFAULT_CATEGORIES.map((category) => category.id)
    expect(new Set(ids).size).toBe(ids.length)
    const parents = DEFAULT_CATEGORIES.flatMap((category) =>
      category.parentId ? [category.parentId] : [],
    )
    expect(parents.every((parent) => ids.includes(parent))).toBe(true)
  })
})

describe('isKnownCategoryId', () => {
  it('returns true for default category', () => {
    expect(isKnownCategoryId('food', DEFAULT_CATEGORIES)).toBe(true)
  })

  it('returns false for unknown category', () => {
    expect(isKnownCategoryId('unknown', DEFAULT_CATEGORIES)).toBe(false)
  })
})

describe('hierarchy', () => {
  it('resolves top-level ids and lists only parents', () => {
    expect(topLevelId('bars', DEFAULT_CATEGORIES)).toBe('going_out')
    expect(topLevelId('food', DEFAULT_CATEGORIES)).toBe('food')
    expect(topLevelId('unknown', DEFAULT_CATEGORIES)).toBe('unknown')
    expect(topLevelCategories(DEFAULT_CATEGORIES).map((c) => c.id)).not.toContain('groceries')
  })

  it('inherits kind from the parent', () => {
    const categories = [...DEFAULT_CATEGORIES, { id: 'mortgage', nameKey: 'x', parentId: 'loans' }]
    expect(effectiveKind('mortgage', categories)).toBe('fixed')
    expect(effectiveKind('bars', categories)).toBeUndefined()
  })

  it('rolls subcategory totals into their parent', () => {
    expect(
      rollupTotals(
        { groceries: 100, restaurants: 50, food: 5, bars: 20, other: 1 },
        DEFAULT_CATEGORIES,
      ),
    ).toEqual({
      food: 155,
      going_out: 20,
      other: 1,
    })
  })

  it('orders children right after their parent, whatever the stored order', () => {
    const stored = [...DEFAULT_CATEGORIES].sort((a, b) => a.id.localeCompare(b.id))
    const order = orderedCategories(stored).map(
      ({ category, parent }) => `${parent?.id ?? ''}/${category.id}`,
    )
    expect(order.slice(0, 6)).toEqual([
      '/food',
      'food/groceries',
      'food/restaurants',
      '/going_out',
      'going_out/bars',
      'going_out/entertainment',
    ])
    expect(order).toHaveLength(DEFAULT_CATEGORIES.length)
  })
})

describe('spendingCategories', () => {
  it('drops savings and income but keeps fixed categories', () => {
    const ids = spendingCategories(DEFAULT_CATEGORIES).map((category) => category.id)
    expect(ids).toContain('loans')
    expect(ids).not.toContain('savings')
    expect(ids).not.toContain('income')
  })
})
