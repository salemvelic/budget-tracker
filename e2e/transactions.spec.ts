import { expect, test } from '@playwright/test'

import { currentMonthIsoDay, resetApp } from './helpers'

const transactionsLink = /Transactions|Transakcije/i

test.describe('Transactions', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('remembered category rule recategorizes matching transactions', async ({ page }) => {
    await page.getByRole('link', { name: transactionsLink }).click()

    await page.getByLabel('Date').fill(currentMonthIsoDay(10))
    await page.getByLabel('Amount').fill('9,99')
    await page.getByLabel('Merchant / description').fill('Demo Shop Zagreb')
    await page.getByRole('button', { name: 'Add' }).click()

    await page.getByLabel('Date').fill(currentMonthIsoDay(11))
    await page.getByLabel('Amount').fill('4,50')
    await page.getByLabel('Merchant / description').fill('Demo Shop Split')
    await page.getByRole('button', { name: 'Add' }).click()

    await page.getByLabel('Category for Demo Shop Zagreb').selectOption('shopping')

    const rulePanel = page
      .getByRole('button', { name: 'Save rule' })
      .locator('xpath=ancestor::div[contains(@class,"rounded-xl")]')
    await rulePanel.locator('input[type="text"]').fill('demo shop')
    await page.getByRole('button', { name: 'Save rule' }).click()

    await expect(page.getByLabel('Category for Demo Shop Split')).toHaveValue('shopping')
  })
})
