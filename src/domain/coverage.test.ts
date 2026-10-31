import { describe, expect, it } from 'vitest'

import { monthCoverage } from './coverage'

describe('monthCoverage', () => {
  it('lists imported sources and flags finished months without their last days', () => {
    expect(monthCoverage({ revolut: '2026-09-30', zaba: '2026-09-17' }, '2026-09', '2026-10-31')).toEqual([
      { source: 'revolut', lastDate: '2026-09-30', missingEnd: false },
      { source: 'zaba', lastDate: '2026-09-17', missingEnd: true },
    ])
  })

  it('does not flag the current month', () => {
    expect(monthCoverage({ kartica: '2026-10-05' }, '2026-10', '2026-10-20')).toEqual([
      { source: 'kartica', lastDate: '2026-10-05', missingEnd: false },
    ])
  })
})
