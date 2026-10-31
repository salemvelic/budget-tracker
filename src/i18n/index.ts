import { createI18n } from 'vue-i18n'

import en from './locales/en.json'
import hr from './locales/hr.json'

const browserLocale = typeof navigator !== 'undefined' ? navigator.language : 'hr-HR'
const defaultLocale = browserLocale.startsWith('hr') ? 'hr' : 'en'

export const i18n = createI18n({
  legacy: false,
  locale: defaultLocale,
  fallbackLocale: 'en',
  messages: { hr, en },
})
