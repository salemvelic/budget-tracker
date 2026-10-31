import { describe, expect, it } from 'vitest'

import { formatEur, parseHrAmount } from './money'

describe('formatEur', () => {
  it('formats cents as HR currency', () => {
    expect(formatEur(123456)).toMatch(/1\.234,56/)
  })

  it('formats zero', () => {
    expect(formatEur(0)).toMatch(/0,00/)
  })
})

describe('parseHrAmount', () => {
  it('parses Croatian thousands separator', () => {
    expect(parseHrAmount('1.234,56')).toBe(123456)
  })

  it('parses dot decimal', () => {
    expect(parseHrAmount('1234.56')).toBe(123456)
  })

  it('parses negative amounts', () => {
    expect(parseHrAmount('-12,5')).toBe(-1250)
  })

  it('throws on empty input', () => {
    expect(() => parseHrAmount('')).toThrow('Empty amount')
  })
})
