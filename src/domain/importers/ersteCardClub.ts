import { categorizeDescription } from '@/domain/categorize'
import { parseHrAmount } from '@/domain/money'
import {
  assignImportHashes,
  type ParsedImportRow,
  type ParsedImportRowDraft,
} from '@/domain/importers/types'

export interface ErsteCardClubSkipped {
  nonTransaction: number
  payment: number
  unparseable: number
}

export interface ErsteCardClubParseResult {
  rows: ParsedImportRow[]
  skipped: ErsteCardClubSkipped
}

const LINE_RE =
  /^(\d{2}\.\d{2}\.\d{4})\.?\s+(\d{2}\.\d{2}\.\d{4})\.?\s+(.+)$/u

const PAYMENT_RE = /\b(uplata|isplata\s+na\s+karticu|credit\s+payment)\b/iu
const CASHBACK_RE = /\b(cashback|povrat\s+naknade)\b/iu
const MEMBERSHIP_RE = /\b(clanarin|card\s+club\s+fee)\b/iu

type CategorizeFn = (description: string) => string

function isoFromHrDate(raw: string): string {
  const cleaned = raw.replace(/\.$/, '')
  const [dd, mm, yyyy] = cleaned.split('.')
  if (!dd || !mm || !yyyy) throw new Error('date.invalid')
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

function parseAmountTail(body: string): { merchant: string; amountRaw: string } | null {
  const amountMatch = body.match(/\s(-?[\d.]+,\d{2})(?:\s*EUR)?\s*$/iu)
  if (!amountMatch || amountMatch.index == null) return null
  const merchant = body.slice(0, amountMatch.index).trim()
  if (!merchant) return null
  return { merchant, amountRaw: amountMatch[1]! }
}

function parseInstallment(body: string): { merchant: string; installment?: string } {
  const match = body.match(/\s(\d+\/\d+)\s*$/u)
  if (!match || match.index == null) return { merchant: body }
  return {
    merchant: body.slice(0, match.index).trim(),
    installment: match[1],
  }
}

export function parseErsteCardClubLines(
  lines: string[],
  categorize: CategorizeFn = categorizeDescription,
): ErsteCardClubParseResult {
  const skipped: ErsteCardClubSkipped = {
    nonTransaction: 0,
    payment: 0,
    unparseable: 0,
  }
  const drafts: ParsedImportRowDraft[] = []

  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line || !LINE_RE.test(line)) {
      if (line.length > 0) skipped.nonTransaction += 1
      continue
    }

    const match = line.match(LINE_RE)
    if (!match || !match[1] || !match[3]) {
      skipped.unparseable += 1
      continue
    }

    const txDateRaw = match[1]
    let body = match[3].trim()

    const withInstallment = parseInstallment(body)
    body = withInstallment.merchant
    const installment = withInstallment.installment

    const tail = parseAmountTail(body)
    if (!tail) {
      skipped.unparseable += 1
      continue
    }

    let merchant = tail.merchant
    if (installment) {
      merchant = `${merchant} (rata ${installment})`
    }

    if (PAYMENT_RE.test(merchant)) {
      skipped.payment += 1
      continue
    }

    let amountCents: number
    try {
      amountCents = parseHrAmount(tail.amountRaw)
    } catch {
      skipped.unparseable += 1
      continue
    }

    if (amountCents < 0 && !CASHBACK_RE.test(merchant)) {
      skipped.payment += 1
      continue
    }

    if (amountCents < 0) {
      amountCents = -Math.abs(amountCents)
    } else {
      amountCents = Math.abs(amountCents)
    }

    let category = categorize(merchant)
    if (MEMBERSHIP_RE.test(merchant)) {
      category = 'other'
    }

    if (amountCents === 0) {
      skipped.unparseable += 1
      continue
    }

    let date: string
    try {
      date = isoFromHrDate(txDateRaw)
    } catch {
      skipped.unparseable += 1
      continue
    }

    drafts.push({
      date,
      amountCents,
      merchant,
      source: 'kartica',
      category,
    })
  }

  return { rows: assignImportHashes(drafts), skipped }
}
