import { describe, expect, it } from 'vitest'

import { formatAmountInput, formatEur, parseHrAmount } from './money'

describe('formatEur', () => {
  it('formats cents as HR currency', () => {
    expect(formatEur(123456)).toMatch(/1\.234,56/)
  })

  it('formats zero', () => {
    expect(formatEur(0)).toMatch(/0,00/)
  })
})

describe('formatAmountInput', () => {
  it('formats without currency symbol', () => {
    expect(formatAmountInput(1250)).toBe('12,50')
    expect(formatAmountInput(123456)).toBe('1.234,56')
  })
})

describe('parseHrAmount', () => {
  it('parses Croatian thousands separator', () => {
    expect(parseHrAmount('1.234,56')).toBe(123456)
  })

  it('parses dot decimal', () => {
    expect(parseHrAmount('1234.56')).toBe(123456)
    expect(parseHrAmount('12.5')).toBe(1250)
  })

  it('treats dot-grouped thousands without decimals as thousands', () => {
    expect(parseHrAmount('1.500')).toBe(150000)
    expect(parseHrAmount('12.345.678')).toBe(1234567800)
  })

  it('parses negative amounts', () => {
    expect(parseHrAmount('-12,5')).toBe(-1250)
  })

  it('parses optional euro sign and spaces', () => {
    expect(parseHrAmount('12,50 €')).toBe(1250)
  })

  it('throws amount.empty on empty input', () => {
    expect(() => parseHrAmount('')).toThrow('amount.empty')
    expect(() => parseHrAmount('€')).toThrow('amount.empty')
  })

  it('rejects junk suffixes', () => {
    expect(() => parseHrAmount('12abc')).toThrow('amount.invalid')
    expect(() => parseHrAmount('1,2,3')).toThrow('amount.invalid')
  })
})
