import type { TxnSource } from '@/db'
import { monthRange } from '@/domain/month'

export const IMPORT_SOURCES: TxnSource[] = ['kartica', 'revolut', 'zaba']

export interface SourceCoverage {
  source: TxnSource
  lastDate: string
  /** The month is over but this source has no data for its last days yet. */
  missingEnd: boolean
}

export function monthCoverage(
  latest: Partial<Record<TxnSource, string>>,
  ym: string,
  todayIso: string,
): SourceCoverage[] {
  const { end } = monthRange(ym)
  return IMPORT_SOURCES.flatMap((source) => {
    const lastDate = latest[source]
    if (!lastDate) return []
    return [{ source, lastDate, missingEnd: end < todayIso && lastDate < end }]
  })
}
