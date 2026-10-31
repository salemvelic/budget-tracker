const eurFormatter = new Intl.NumberFormat('hr-HR', {
  style: 'currency',
  currency: 'EUR',
})

const AMOUNT_PATTERNS = [
  /^-?\d{1,3}(\.\d{3})*(,\d{1,2})?$/,
  /^-?\d+(,\d{1,2})?$/,
  /^-?\d+(\.\d{1,2})?$/,
] as const

/** Format integer cents as EUR for display. */
export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100)
}

/** Format cents for editable amount fields (no currency symbol). */
export function formatAmountInput(cents: number): string {
  const negative = cents < 0
  const abs = Math.abs(cents)
  const whole = Math.floor(abs / 100)
  const frac = (abs % 100).toString().padStart(2, '0')
  const wholeStr = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${negative ? '-' : ''}${wholeStr},${frac}`
}

function normalizeAmountString(raw: string): string {
  return raw
    .trim()
    .replace(/\u00a0/g, '')
    .replace(/\s/g, '')
    .replace(/€/g, '')
    .trim()
}

function parseNormalizedAmount(normalized: string): number {
  const negative = normalized.startsWith('-')
  const unsigned = negative ? normalized.slice(1) : normalized

  if (!AMOUNT_PATTERNS.some((pattern) => pattern.test(unsigned))) {
    throw new Error('amount.invalid')
  }

  let decimal: string
  if (/^\d{1,3}(\.\d{3})+$/.test(unsigned)) {
    // "1.500" is Croatian thousands grouping, not 1,5.
    decimal = unsigned.replace(/\./g, '')
  } else if (unsigned.includes(',') && unsigned.includes('.')) {
    decimal = unsigned.replace(/\./g, '').replace(',', '.')
  } else if (unsigned.includes(',')) {
    decimal = unsigned.replace(',', '.')
  } else {
    decimal = unsigned
  }

  const value = Number.parseFloat(decimal)
  if (Number.isNaN(value)) {
    throw new Error('amount.invalid')
  }

  return Math.round(value * 100) * (negative ? -1 : 1)
}

/**
 * Parse Croatian or plain decimal amount strings into integer cents.
 * Examples: "1.234,56" → 123456, "-12,5" → -1250, "1234.56" → 123456
 */
export function parseHrAmount(raw: string): number {
  const normalized = normalizeAmountString(raw)
  if (!normalized) {
    throw new Error('amount.empty')
  }
  return parseNormalizedAmount(normalized)
}
