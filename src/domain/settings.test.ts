import { describe, expect, it } from 'vitest'

import { DEFAULT_SETTINGS, rowsToSettings, settingsToRows, validateSettings } from './settings'

describe('validateSettings', () => {
  it('returns defaults when partial input is empty', () => {
    expect(validateSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects negative or fractional amounts', () => {
    expect(() => validateSettings({ monthlyLimitCents: -1 })).toThrow('Invalid monthlyLimitCents')
    expect(() => validateSettings({ emergencySavedCents: 1.5 })).toThrow(
      'Invalid emergencySavedCents',
    )
  })
})

describe('settings rows roundtrip', () => {
  it('serializes and parses settings', () => {
    const settings = validateSettings({ monthlyLimitCents: 50_000 })
    expect(rowsToSettings(settingsToRows(settings))).toEqual(settings)
  })

  it('ignores unknown stored keys', () => {
    expect(rowsToSettings([{ key: 'statementCloseDay', value: '19' }])).toEqual(DEFAULT_SETTINGS)
  })
})
