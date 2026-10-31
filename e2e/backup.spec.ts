import { expect, test } from '@playwright/test'

import { resetApp } from './helpers'

test.describe('Backup export', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('falls back to download when showSaveFilePicker is missing', async ({ page }) => {
    await page.addInitScript(() => {
      delete (window as Window & { showSaveFilePicker?: unknown }).showSaveFilePicker
    })
    await page.goto('/#/settings')
    await page.getByRole('navigation').waitFor()

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /Export backup/i }).click()
    const download = await downloadPromise
    expect(download.suggestedFilename()).toMatch(/budget-tracker-backup-\d{4}-\d{2}-\d{2}\.json/)
  })

  test('reuses a picked file without opening the picker again', async ({ page }) => {
    await page.addInitScript(() => {
      const writes: string[] = []
      const handle = {
        name: 'e2e-backup.json',
        queryPermission: async () => 'granted',
        requestPermission: async () => 'granted',
        createWritable: async () => ({
          write: async (data: string) => {
            writes.push(data)
          },
          close: async () => undefined,
        }),
      }
      ;(window as Window & { __backupWrites?: string[] }).__backupWrites = writes
      let pickerCalls = 0
      window.showSaveFilePicker = async () => {
        pickerCalls += 1
        ;(window as Window & { __pickerCalls?: number }).__pickerCalls = pickerCalls
        return handle as unknown as FileSystemFileHandle
      }
    })

    await page.goto('/#/settings')
    await page.getByRole('navigation').waitFor()

    await page.getByRole('button', { name: /Export backup/i }).click()
    await expect(page.getByText(/saved to|exported|spremljeno|izvezeno/i)).toBeVisible()

    await page.getByRole('button', { name: /Export backup/i }).click()
    await expect(page.getByText(/saved to|exported|spremljeno|izvezeno/i)).toBeVisible()

    const pickerCalls = await page.evaluate(
      () => (window as Window & { __pickerCalls?: number }).__pickerCalls,
    )
    expect(pickerCalls).toBe(1)
  })
})
