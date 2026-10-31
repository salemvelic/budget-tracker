import { db } from '@/db'
import { backupFileName } from '@/domain/backup'

const HANDLE_KEY = 'backup'

export function supportsBackupFilePicker(): boolean {
  return typeof window.showSaveFilePicker === 'function'
}

async function getStoredHandle(): Promise<FileSystemFileHandle | null> {
  const row = await db.fileHandles.get(HANDLE_KEY)
  return row?.handle ?? null
}

async function storeHandle(handle: FileSystemFileHandle): Promise<void> {
  await db.fileHandles.put({ key: HANDLE_KEY, handle })
}

async function ensureWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}

export async function hasBackupFile(): Promise<boolean> {
  if (!supportsBackupFilePicker()) return false
  return (await getStoredHandle()) != null
}

export async function backupFileLabel(): Promise<string | null> {
  const handle = await getStoredHandle()
  return handle?.name ?? null
}

export async function chooseBackupFile(): Promise<boolean> {
  if (!supportsBackupFilePicker()) return false
  const handle = await window.showSaveFilePicker!({
    suggestedName: backupFileName(),
    types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
  })
  await storeHandle(handle)
  return true
}

function downloadBackup(json: string): void {
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName()
  link.click()
  URL.revokeObjectURL(url)
}

async function writeToHandle(handle: FileSystemFileHandle, json: string): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(json)
  await writable.close()
}

/** Saves backup JSON to a chosen file or downloads it. */
export async function saveBackupToFile(json: string): Promise<'file' | 'download'> {
  if (!supportsBackupFilePicker()) {
    downloadBackup(json)
    return 'download'
  }

  let handle = await getStoredHandle()
  if (handle && !(await ensureWritePermission(handle))) {
    handle = null
  }
  if (!handle) {
    handle = await window.showSaveFilePicker!({
      suggestedName: backupFileName(),
      types: [{ description: 'JSON', accept: { 'application/json': ['.json'] } }],
    })
    await storeHandle(handle)
  }

  await writeToHandle(handle, json)
  return 'file'
}
