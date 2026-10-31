import { beforeEach, describe, expect, it, vi } from 'vitest'

import { db } from '@/db'

import { chooseBackupFile, hasBackupFile, saveBackupToFile } from './backupFile'

const handleStore = new Map<string, FileSystemFileHandle>()

function mockHandle(name = 'demo-backup.json') {
  const writes: string[] = []
  return {
    name,
    queryPermission: vi.fn<[], PermissionState>(async () => 'granted'),
    requestPermission: vi.fn<[], PermissionState>(async () => 'granted'),
    createWritable: vi.fn<[], Promise<{ write: (data: string) => Promise<void>; close: () => Promise<void> }>>(
      async () => ({
      write: async (data: string) => {
        writes.push(data)
      },
      close: async () => undefined,
      }),
    ),
    writes,
  }
}

function mockFileHandles() {
  vi.spyOn(db.fileHandles, 'get').mockImplementation(async (key) => {
    const handle = handleStore.get(key)
    return handle ? { key, handle } : undefined
  })
  vi.spyOn(db.fileHandles, 'put').mockImplementation(async (row) => {
    handleStore.set(row.key, row.handle)
  })
}

describe('saveBackupToFile', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    handleStore.clear()
    delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker
    await db.delete()
    await db.open()
    mockFileHandles()
  })

  it('downloads when the File System Access API is missing', async () => {
    const click = vi.fn<[], void>()
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(document, 'createElement').mockReturnValue({ click } as unknown as HTMLAnchorElement)
    const mode = await saveBackupToFile('{}')
    expect(mode).toBe('download')
    expect(click).toHaveBeenCalled()
  })

  it('reuses a stored handle on the second save', async () => {
    const handle = mockHandle()
    window.showSaveFilePicker = vi.fn<[], Promise<FileSystemFileHandle>>(async () =>
      handle as unknown as FileSystemFileHandle,
    )
    expect(await saveBackupToFile('{"a":1}')).toBe('file')
    expect(await saveBackupToFile('{"b":2}')).toBe('file')
    expect(window.showSaveFilePicker).toHaveBeenCalledTimes(1)
    expect(await hasBackupFile()).toBe(true)
  })

  it('asks for a new file when permission is denied', async () => {
    const first = mockHandle('first.json')
    const second = mockHandle('second.json')
    window.showSaveFilePicker = vi
      .fn<[], Promise<FileSystemFileHandle>>()
      .mockResolvedValueOnce(first as unknown as FileSystemFileHandle)
      .mockResolvedValueOnce(second as unknown as FileSystemFileHandle)
    expect(await saveBackupToFile('a')).toBe('file')
    first.queryPermission = vi.fn<[], PermissionState>(async () => 'denied')
    first.requestPermission = vi.fn<[], PermissionState>(async () => 'denied')
    expect(await saveBackupToFile('b')).toBe('file')
    expect(window.showSaveFilePicker).toHaveBeenCalledTimes(2)
  })
})

describe('chooseBackupFile', () => {
  beforeEach(async () => {
    vi.restoreAllMocks()
    handleStore.clear()
    await db.delete()
    await db.open()
    mockFileHandles()
  })

  it('stores a newly picked handle', async () => {
    const handle = mockHandle()
    window.showSaveFilePicker = vi.fn<[], Promise<FileSystemFileHandle>>(async () =>
      handle as unknown as FileSystemFileHandle,
    )
    expect(await chooseBackupFile()).toBe(true)
    expect(await hasBackupFile()).toBe(true)
  })
})
