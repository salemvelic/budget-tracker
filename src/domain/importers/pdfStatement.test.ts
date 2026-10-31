import { describe, expect, it } from 'vitest'

import { parsePdfStatement } from './pdfStatement'

describe('parsePdfStatement', () => {
  it('rejects PDFs without text', () => {
    expect(() => parsePdfStatement([])).toThrow('pdf.noText')
  })

  it('rejects unknown statements', () => {
    expect(() => parsePdfStatement([[{ x: 10, text: 'Some other bank' }]])).toThrow('pdf.unknown')
  })

  it('routes by detected statement kind', () => {
    expect(parsePdfStatement([[{ x: 38, text: 'Obavijest o troškovima za: 10/26' }]]).kind).toBe(
      'erste',
    )
    expect(
      parsePdfStatement([
        [{ x: 416, text: 'Izvadak za EUR' }],
        [{ x: 490, text: 'Revolut Bank UAB' }],
      ]).kind,
    ).toBe('revolut')
  })
})
