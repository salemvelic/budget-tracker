import { describe, expect, it } from 'vitest'

import { i18n } from '@/i18n'

import en from './locales/en.json'
import hr from './locales/hr.json'

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([key, value]) =>
    typeof value === 'object' && value != null ? keys(value, `${prefix}${key}.`) : [`${prefix}${key}`],
  )
}

const ERROR_CODES = {
  transactions: ['amount.empty', 'amount.invalid', 'date.invalid', 'merchant.empty', 'category.empty'],
  import: ['import.failed', 'pdf.noText', 'pdf.unknown', 'empty'],
  'settings.rules': ['rule.empty', 'rule.invalid'],
}

describe('locales', () => {
  it('hr and en define the same keys', () => {
    expect(keys(hr).sort()).toEqual(keys(en).sort())
  })

  it.each(['hr', 'en'] as const)('resolves every error code in %s', (locale) => {
    i18n.global.locale.value = locale
    for (const [scope, codes] of Object.entries(ERROR_CODES)) {
      for (const code of codes) {
        expect(i18n.global.te(`${scope}.errors.${code}`), `${scope}.errors.${code}`).toBe(true)
      }
    }
  })
})
