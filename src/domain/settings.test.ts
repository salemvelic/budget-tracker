import { describe, expect, it } from 'vitest'

import {
  DEFAULT_SETTINGS,
  rowsToSettings,
  settingsToRows,
  validateSettings,
} from './settings'

describe('validateSettings', () => {
  it('returns defaults when partial input is empty', () => {
    expect(validateSettings({})).toEqual(DEFAULT_SETTINGS)
  })

  it('rejects invalid statement close day', () => {
    expect(() => validateSettings({ statementCloseDay: 29 })).toThrow('Invalid statementCloseDay')
  })
})

describe('settings rows roundtrip', () => {
  it('serializes and parses settings', () => {
    const settings = validateSettings({ monthlyLimitCents: 50_000 })
    const rows = settingsToRows(settings)
    expect(rowsToSettings(rows)).toEqual(settings)
  })
})
