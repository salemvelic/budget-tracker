/** Calendar month key `yyyy-mm`. */
export function monthKey(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

/** Inclusive ISO date range for a calendar month. */
export function monthRange(ym: string): { start: string; end: string } {
  const [yStr, mStr] = ym.split('-')
  const year = Number(yStr)
  const month = Number(mStr)
  if (!year || !month || month < 1 || month > 12) {
    throw new Error(`Invalid month key: ${ym}`)
  }
  const start = `${ym}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end = `${ym}-${String(lastDay).padStart(2, '0')}`
  return { start, end }
}

export function daysLeftInMonth(today: Date = new Date()): number {
  const last = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  return last - today.getDate() + 1
}

export function dailyAllowanceCents(
  limitCents: number,
  spentCents: number,
  today: Date = new Date(),
): number {
  const daysLeft = Math.max(1, daysLeftInMonth(today))
  return Math.floor((limitCents - spentCents) / daysLeft)
}
