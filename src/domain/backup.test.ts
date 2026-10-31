import { describe, expect, it } from 'vitest'

import { backupFileName, buildBackup, parseBackup, type BackupData } from './backup'

const data: BackupData = {
  txns: [
    {
      id: 1,
      date: '2026-10-01',
      amountCents: 1250,
      merchant: 'Demo',
      source: 'kartica',
      category: 'food',
    },
  ],
  rules: [{ id: 1, pattern: 'demo', category: 'food' }],
  categories: [{ id: 'food', nameKey: 'categories.food', budgetCents: 20000 }],
  settings: [{ key: 'monthlyLimitCents', value: '60000' }],
  ignoredImports: [{ importHash: 'kartica|id:X' }],
}

describe('backup', () => {
  it('round-trips through JSON', () => {
    const file = buildBackup(data, new Date('2026-10-31T10:00:00Z'))
    expect(file.exportedAt).toBe('2026-10-31T10:00:00.000Z')
    expect(parseBackup(JSON.stringify(file))).toEqual(data)
  })

  it('rejects non-backup JSON and broken rows', () => {
    expect(() => parseBackup('not json')).toThrow('backup.invalid')
    expect(() => parseBackup('{"format":"other"}')).toThrow('backup.invalid')
    const broken = { ...buildBackup(data), txns: [{ date: '1.10.2026', amountCents: 1.5 }] }
    expect(() => parseBackup(JSON.stringify(broken))).toThrow('backup.invalid')
  })

  it('rejects unknown versions', () => {
    expect(() => parseBackup(JSON.stringify({ ...buildBackup(data), version: 99 }))).toThrow(
      'backup.version',
    )
  })

  it('accepts backups without ignoredImports', () => {
    const { ignoredImports: _omit, ...rest } = buildBackup(data)
    expect(parseBackup(JSON.stringify(rest)).ignoredImports).toEqual([])
  })

  it('names files with the export date', () => {
    expect(backupFileName(new Date('2026-10-31T10:00:00Z'))).toBe(
      'budget-tracker-backup-2026-10-31.json',
    )
  })
})
