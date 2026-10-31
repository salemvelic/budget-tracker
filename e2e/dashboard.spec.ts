import { expect, test } from '@playwright/test'

import { currentMonthIsoDay, resetApp } from './helpers'

const transactionsLink = /Transactions|Transakcije/i
const dashboardLink = /Dashboard|Pregled/i

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('persists collapsed sections and backup banner dismissal', async ({ page }) => {
    await page.getByRole('link', { name: transactionsLink }).click()
    await page.getByLabel('Date').fill(currentMonthIsoDay(3))
    await page.getByLabel('Amount').fill('1,00')
    await page.getByLabel('Merchant / description').fill('Banner seed txn')
    await page.getByRole('button', { name: 'Add' }).click()

    await page.getByRole('link', { name: dashboardLink }).click()
    const incomeSection = page.getByRole('button', { name: /Income|Priljevi/i })
    await incomeSection.click()
    await expect(incomeSection).toHaveAttribute('aria-expanded', 'false')

    await page.reload()
    await expect(incomeSection).toHaveAttribute('aria-expanded', 'false')

    const dismiss = page.getByRole('button', { name: /Dismiss warning|Zatvori upozorenje/i })
    await expect(dismiss).toBeVisible()
    await dismiss.click()
    await expect(dismiss).toBeHidden()

    await page.reload()
    await expect(dismiss).toBeVisible()
  })
})
