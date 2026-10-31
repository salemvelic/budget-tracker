const eurFormatter = new Intl.NumberFormat('hr-HR', {
  style: 'currency',
  currency: 'EUR',
})

/** Format integer cents as EUR for display. */
export function formatEur(cents: number): string {
  return eurFormatter.format(cents / 100)
}

/**
 * Parse Croatian or plain decimal amount strings into integer cents.
 * Examples: "1.234,56" → 123456, "-12,5" → -1250, "1234.56" → 123456
 */
export function parseHrAmount(raw: string): number {
  const trimmed = raw.trim().replace(/\s/g, '')
  if (!trimmed) {
    throw new Error('Empty amount')
  }

  const negative = trimmed.startsWith('-')
  const unsigned = negative ? trimmed.slice(1) : trimmed

  let normalized: string
  if (unsigned.includes(',') && unsigned.includes('.')) {
    normalized = unsigned.replace(/\./g, '').replace(',', '.')
  } else if (unsigned.includes(',')) {
    normalized = unsigned.replace(',', '.')
  } else {
    normalized = unsigned
  }

  const value = Number.parseFloat(normalized)
  if (Number.isNaN(value)) {
    throw new Error(`Invalid amount: ${raw}`)
  }

  return Math.round(value * 100) * (negative ? -1 : 1)
}
