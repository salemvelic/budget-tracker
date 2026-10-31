import { describe, expect, it } from 'vitest'

import { categorizeDescription, DEFAULT_CATEGORY_RULES } from './categorize'

describe('categorizeDescription', () => {
  it('matches food patterns', () => {
    expect(categorizeDescription('Orchard Grocers', DEFAULT_CATEGORY_RULES)).toBe('food')
  })

  it('matches fuel patterns', () => {
    expect(categorizeDescription('Metro Fuel station', DEFAULT_CATEGORY_RULES)).toBe('fuel')
  })

  it('falls back to other', () => {
    expect(categorizeDescription('Unknown vendor', DEFAULT_CATEGORY_RULES)).toBe('other')
  })
})
