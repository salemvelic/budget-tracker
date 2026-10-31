import { expect, test } from '@playwright/test'

import { writeZabaPdf } from './fixtures/zabaPdf'
import { resetApp } from './helpers'

const dashboardLink = /Dashboard|Pregled/i

test.describe('PDF import', () => {
  test.beforeEach(async ({ page }) => {
    await resetApp(page)
  })

  test('imports salary and detects duplicates on re-import', async ({ page, context }, testInfo) => {
    const pdfPath = testInfo.outputPath('zaba-statement.pdf')
    const pdfPage = await context.newPage()
    await writeZabaPdf(pdfPage, pdfPath)
    await pdfPage.close()

    await page.getByRole('link', { name: /Import|Uvoz/i }).click()
    await page.locator('input[type="file"]').setInputFiles(pdfPath)

    await expect(page.getByText(/new transactions to import|novih transakcija za uvoz/i)).toBeVisible()
    await expect(page.getByText('Demo d.o.o.')).toBeVisible()
    await page.getByRole('button', { name: /Import into database|Uvezi u bazu/i }).click()
    await expect(page.getByText(/Imported \d+ transactions\.|Uvezeno \d+ transakcija\./)).toBeVisible()

    await page.getByRole('link', { name: dashboardLink }).click()
    const incomeSection = page.getByRole('button', { name: /Income|Priljevi/i })
    if ((await incomeSection.getAttribute('aria-expanded')) === 'false') {
      await incomeSection.click()
    }
    await expect(page.getByText('1.500,00 €')).toBeVisible()

    await page.getByRole('link', { name: /Import|Uvoz/i }).click()
    await page.locator('input[type="file"]').setInputFiles(pdfPath)
    await expect(page.getByText(/already imported|već u bazi/i)).toBeVisible()
  })
})
