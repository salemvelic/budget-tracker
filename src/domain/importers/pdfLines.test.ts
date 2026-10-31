import { describe, expect, it } from 'vitest'

import { groupPageText, lineText } from './pdfLines'

describe('groupPageText', () => {
  it('groups by y (top first) and sorts cells by x', () => {
    const lines = groupPageText([
      { text: 'second', x: 10, y: 100, width: 30 },
      { text: '12,00', x: 300, y: 200.5, width: 20 },
      { text: 'first', x: 10, y: 200, width: 25 },
    ])
    expect(lines).toEqual([
      [
        { x: 10, text: 'first' },
        { x: 300, text: '12,00' },
      ],
      [{ x: 10, text: 'second' }],
    ])
  })

  it('merges fragments that touch each other', () => {
    const [line] = groupPageText([
      { text: 'Demo', x: 100, y: 50, width: 20 },
      { text: 'Shop', x: 121, y: 50, width: 20 },
    ])
    expect(line).toEqual([{ x: 100, text: 'Demo Shop' }])
    expect(lineText(line!)).toBe('Demo Shop')
  })
})
