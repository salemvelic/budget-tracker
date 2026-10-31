import { describe, expect, it } from 'vitest'

import {
  categorizeDescription,
  isSameMerchant,
  matchesCategoryPattern,
  merchantRulePattern,
  recategorizeOther,
  subcategoryUpgrade,
  validateRulePattern,
} from './categorize'

describe('merchantRulePattern', () => {
  it('matches the merchant literally, including regex characters', () => {
    const pattern = merchantRulePattern('INT*DEMO  Vending (Zagreb)')
    expect(validateRulePattern(pattern)).toBe('')
    expect(matchesCategoryPattern(pattern, 'int*demo vending (zagreb)')).toBe(true)
    expect(matchesCategoryPattern(pattern, 'INTXDEMO vending zagreb')).toBe(false)
  })
})

describe('isSameMerchant', () => {
  it('ignores case and repeated whitespace', () => {
    expect(isSameMerchant('Demo  Shop ', 'demo shop')).toBe(true)
    expect(isSameMerchant('Demo Shop', 'Demo Shop 2')).toBe(false)
  })
})

describe('matchesCategoryPattern', () => {
  it('does not match inside other words', () => {
    expect(matchesCategoryPattern('ina', 'Marina shop')).toBe(false)
    expect(matchesCategoryPattern('apple', 'Pineapple bar')).toBe(false)
  })

  it('matches whole words next to digits or punctuation', () => {
    expect(matchesCategoryPattern('ina', 'INA Zagreb')).toBe(true)
    expect(matchesCategoryPattern('studenac', 'STUDENAC1234 Grad')).toBe(true)
    expect(matchesCategoryPattern('bolt', 'BOLT.EU O 123')).toBe(true)
    expect(matchesCategoryPattern('režije', 'Pay režije Grad')).toBe(true)
  })

  it('returns false for invalid regex patterns', () => {
    expect(matchesCategoryPattern('(', 'test')).toBe(false)
  })
})

describe('categorizeDescription', () => {
  it.each([
    ['Orchard Grocers', 'groceries'],
    ['KONZUM P-100 Grad', 'groceries'],
    ['TRGOVINA KRK P100 Grad', 'groceries'],
    ['RESTORAN DEMO Grad', 'restaurants'],
    ['Demopizza/kiosk', 'restaurants'],
    ['Demo Street Food Bar Grad', 'restaurants'],
    ['Demo Beer Store Grad', 'bars'],
    ['Democafe', 'bars'],
    ['Pay cuga Grad', 'bars'],
    ['Demo Music Pub', 'bars'],
    ['T5 Social Grad', 'bars'],
    ['CINESTAR GRAD WALLET', 'entertainment'],
    ['LUDAKUCA.HR Zagreb', 'entertainment'],
    ['Demo osoba Hajduk', 'entertainment'],
    ['RYANAIR DUBLIN', 'travel'],
    ['STB Bucuresti', 'travel'],
    ['Demo Railways Ecommerce', 'travel'],
    ['Demo.gov.kg', 'travel'],
    ['Metro Fuel station', 'fuel'],
    ['Ktc 15 B.p.', 'fuel'],
    ['Demo Taxi Ride', 'transport'],
    ['Pay rezije Grad', 'utilities'],
    ['Amazon', 'shopping'],
    ['SANCTA DOMENICA WEB (1/3)', 'shopping'],
    ['MyHeritage', 'subscriptions'],
    ['Naknada za Premium plan', 'subscriptions'],
    ['Unknown vendor', 'other'],
  ])('%s → %s', (description, category) => {
    expect(categorizeDescription(description)).toBe(category)
  })

  it('lets earlier (user) rules win', () => {
    expect(categorizeDescription('Amazon', [{ pattern: 'amazon', category: 'other' }])).toBe(
      'other',
    )
  })
})

describe('validateRulePattern', () => {
  it('accepts plain and alternative patterns', () => {
    expect(validateRulePattern('demo shop|demo cafe')).toBe('')
  })

  it('rejects empty, broken and match-everything patterns', () => {
    expect(validateRulePattern('  ')).toBe('rule.empty')
    expect(validateRulePattern('(')).toBe('rule.invalid')
    expect(validateRulePattern('demo|')).toBe('rule.invalid')
    expect(validateRulePattern('a||b')).toBe('rule.invalid')
  })
})

describe('subcategoryUpgrade', () => {
  it.each([
    [{ merchant: 'Demo Beer Store', category: 'other' }, 'bars'],
    [{ merchant: 'Demo osoba', note: 'Hajduk', category: 'other' }, 'entertainment'],
    [{ merchant: 'LIDL P-1 Grad', category: 'food' }, 'groceries'],
    [{ merchant: 'Democafe', category: 'food' }, 'bars'],
    [{ merchant: 'RYANAIR DUBLIN', category: 'transport' }, 'travel'],
    [{ merchant: 'Unknown', category: 'food' }, null],
    [{ merchant: 'LIDL P-1 Grad', category: 'shopping' }, null],
    [{ merchant: 'Bolt', category: 'transport' }, null],
  ])('%o → %s', (txn, expected) => {
    expect(subcategoryUpgrade(txn)).toBe(expected)
  })
})

describe('recategorizeOther', () => {
  it('only moves transactions out of other', () => {
    const changes = recategorizeOther(
      [
        { id: 1, merchant: 'Demo Cafe', category: 'other' },
        { id: 2, merchant: 'Demo Cafe', category: 'shopping' },
        { id: 3, merchant: 'Nothing', category: 'other' },
      ],
      [{ pattern: 'demo cafe', category: 'food' }],
    )
    expect(changes).toEqual([{ id: 1, category: 'food' }])
  })
})
