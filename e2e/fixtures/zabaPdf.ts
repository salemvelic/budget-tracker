import type { Page } from '@playwright/test'

import {
  buildE2eZabaLines,
  splitZabaPages,
  zabaPagesToHtml,
} from '@/domain/importers/zabaPrint'

/** Builds a fictional ZABA PDF using Chromium print (same layout as zabaPrint.test.ts). */
export async function writeZabaPdf(page: Page, outputPath: string): Promise<void> {
  const html = zabaPagesToHtml(splitZabaPages(buildE2eZabaLines()))
  await page.setContent(`<!DOCTYPE html><html><body style="margin:0">${html}</body></html>`, {
    waitUntil: 'load',
  })
  await page.pdf({
    path: outputPath,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  })
}
