import type { Category, CategoryRule, IgnoredImport, SettingRow, Txn, TxnSource } from '@/db'

export const BACKUP_FORMAT = 'budget-tracker-backup'
export const BACKUP_VERSION = 1

export interface BackupData {
  txns: Txn[]
  rules: CategoryRule[]
  categories: Category[]
  settings: SettingRow[]
  ignoredImports: IgnoredImport[]
}

export interface BackupFile extends BackupData {
  format: typeof BACKUP_FORMAT
  version: number
  exportedAt: string
}

const SOURCES: TxnSource[] = ['kartica', 'revolut', 'zaba', 'gotovina']
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function buildBackup(data: BackupData, now: Date = new Date()): BackupFile {
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: now.toISOString(), ...data }
}

export function backupFileName(now: Date = new Date()): string {
  return `budget-tracker-backup-${now.toISOString().slice(0, 10)}.json`
}

const BACKUP_INTERVAL_MS = 30 * 24 * 60 * 60 * 1000

/** True when there is data and no backup in the last 30 days (or never). */
export function backupDue(lastBackupAt: number, txnCount: number, now = Date.now()): boolean {
  if (txnCount === 0) return false
  if (lastBackupAt === 0) return true
  return now - lastBackupAt > BACKUP_INTERVAL_MS
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value != null && !Array.isArray(value)
}

function isTxn(value: unknown): value is Txn {
  return (
    isRecord(value) &&
    typeof value.date === 'string' &&
    ISO_DATE.test(value.date) &&
    Number.isInteger(value.amountCents) &&
    typeof value.merchant === 'string' &&
    SOURCES.includes(value.source as TxnSource) &&
    typeof value.category === 'string'
  )
}

function arrayOf<T>(value: unknown, guard: (item: unknown) => item is T): T[] {
  if (!Array.isArray(value) || !value.every(guard)) throw new Error('backup.invalid')
  return value
}

const isRule = (v: unknown): v is CategoryRule =>
  isRecord(v) && typeof v.pattern === 'string' && typeof v.category === 'string'
const isCategory = (v: unknown): v is Category =>
  isRecord(v) && typeof v.id === 'string' && typeof v.nameKey === 'string'
const isSetting = (v: unknown): v is SettingRow =>
  isRecord(v) && typeof v.key === 'string' && typeof v.value === 'string'
const isIgnored = (v: unknown): v is IgnoredImport =>
  isRecord(v) && typeof v.importHash === 'string'

/** Validate a backup file's JSON text; throws `backup.invalid` or `backup.version`. */
export function parseBackup(text: string): BackupData {
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error('backup.invalid')
  }
  if (!isRecord(json) || json.format !== BACKUP_FORMAT) throw new Error('backup.invalid')
  if (json.version !== BACKUP_VERSION) throw new Error('backup.version')

  return {
    txns: arrayOf(json.txns, isTxn),
    rules: arrayOf(json.rules, isRule),
    categories: arrayOf(json.categories, isCategory),
    settings: arrayOf(json.settings, isSetting),
    ignoredImports: arrayOf(json.ignoredImports ?? [], isIgnored),
  }
}
