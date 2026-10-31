import type { SettingRow } from '@/db'

export interface AppSettings {
  monthlyLimitCents: number
  emergencyTargetCents: number
  emergencySavedCents: number
  statementCloseDay: number
}

export const SETTINGS_KEYS = {
  monthlyLimitCents: 'monthlyLimitCents',
  emergencyTargetCents: 'emergencyTargetCents',
  emergencySavedCents: 'emergencySavedCents',
  statementCloseDay: 'statementCloseDay',
} as const satisfies Record<keyof AppSettings, string>

/** Generic demo defaults — not personal financial data. */
export const DEFAULT_SETTINGS: AppSettings = {
  monthlyLimitCents: 60_000,
  emergencyTargetCents: 300_000,
  emergencySavedCents: 0,
  statementCloseDay: 19,
}

export function validateSettings(input: Partial<AppSettings>): AppSettings {
  const merged: AppSettings = { ...DEFAULT_SETTINGS, ...input }

  if (!Number.isInteger(merged.monthlyLimitCents) || merged.monthlyLimitCents < 0) {
    throw new Error('Invalid monthlyLimitCents')
  }
  if (!Number.isInteger(merged.emergencyTargetCents) || merged.emergencyTargetCents < 0) {
    throw new Error('Invalid emergencyTargetCents')
  }
  if (!Number.isInteger(merged.emergencySavedCents) || merged.emergencySavedCents < 0) {
    throw new Error('Invalid emergencySavedCents')
  }
  if (
    !Number.isInteger(merged.statementCloseDay) ||
    merged.statementCloseDay < 1 ||
    merged.statementCloseDay > 28
  ) {
    throw new Error('Invalid statementCloseDay')
  }

  return merged
}

export function settingsToRows(settings: AppSettings): SettingRow[] {
  return (Object.keys(SETTINGS_KEYS) as (keyof AppSettings)[]).map((key) => ({
    key: SETTINGS_KEYS[key],
    value: String(settings[key]),
  }))
}

export function rowsToSettings(rows: SettingRow[]): AppSettings {
  const map = new Map(rows.map((row) => [row.key, row.value]))
  const partial: Partial<AppSettings> = {}

  for (const key of Object.keys(SETTINGS_KEYS) as (keyof AppSettings)[]) {
    const raw = map.get(SETTINGS_KEYS[key])
    if (raw != null && raw !== '') {
      partial[key] = Number(raw)
    }
  }

  return validateSettings(partial)
}
