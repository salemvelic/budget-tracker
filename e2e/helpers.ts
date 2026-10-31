import type { Page } from '@playwright/test'

const DB_NAME = 'budget-tracker'

/** Clears IndexedDB and reloads so Dexie re-seeds defaults. */
export async function resetApp(page: Page): Promise<void> {
  await page.goto('/')
  await page.evaluate(async (name) => {
    await new Promise<void>((resolve, reject) => {
      const req = indexedDB.deleteDatabase(name)
      req.onsuccess = () => resolve()
      req.onerror = () => reject(req.error)
      req.onblocked = () => resolve()
    })
  }, DB_NAME)
  await page.reload()
  await page.getByRole('navigation').waitFor()
}

/** ISO date for the current calendar month (app default month). */
export function currentMonthIsoDay(day: number): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

/** Croatian bank statement date token (dd.mm.yyyy.). */
export function hrStatementDate(day: number): string {
  const now = new Date()
  const yyyy = now.getFullYear()
  const mm = String(now.getMonth() + 1).padStart(2, '0')
  const dd = String(day).padStart(2, '0')
  return `${dd}.${mm}.${yyyy}.`
}
