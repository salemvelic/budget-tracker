import { describe, expect, it } from 'vitest'

import { DEFAULT_CATEGORIES, isKnownCategoryId, spendingCategories } from './categories'

describe('spendingCategories', () => {
  it('drops savings but keeps fixed categories', () => {
    const ids = spendingCategories(DEFAULT_CATEGORIES).map((category) => category.id)
    expect(ids).toContain('loans')
    expect(ids).not.toContain('savings')
  })
})

describe('DEFAULT_CATEGORIES', () => {
  it('has unique ids', () => {
    const ids = DEFAULT_CATEGORIES.map((category) => category.id)
    expect(new Set(ids).size).toBe(ids.length)
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
