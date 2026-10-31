import { categorizeDescription, txnDescription } from '@/domain/categorize'
import { parseHrAmount } from '@/domain/money'
import { lineText } from '@/domain/importers/pdfLines'
import {
  assignImportHashes,
  countSkip,
  type ImportParseResult,
  type ImportSkipped,
  type ParsedImportRowDraft,
  type TextLine,
} from '@/domain/importers/types'

/** Column x-ranges on the Zagrebačka banka "Jedinstveni izvadak građana". */
const COL = {
  dateMax: 90,
  descMin: 95,
  descMax: 110,
  amountMin: 440,
  outflowMin: 500,
  amountMax: 570,
  holderMin: 330,
  holderMax: 420,
} as const

const DATE_RE = /^(\d{2})\.(\d{2})\.(\d{4})\.$/
const AMOUNT_RE = /^\d{1,3}(?:\.\d{3})*,\d{2}$/
const REF_RE = /^([A-Z])\d{10,}\s+/
const LOAN_ACCOUNT_RE = /^(\d{6,})\s+-\s+dospjelo$/u
const LOAN_KIND_RE = /\(([^)]+kredit)\)/iu
const IBAN_RE = /\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/
const HOLDER_RE = /^\p{Lu}[\p{Lu}\s.'-]+$/u

const TOP_UP_RE = /\brevolut\b/iu
const CARD_BILL_RE = /obavijest o troškovima|erste\s*&?\s*steiermaerkische/iu
const LOAN_RE = /otplatu kredita/iu
const CASH_RE = /^podizanje gotov/iu
const ATM_PREFIX_RE = /^.*?\bbankomatu\s+/iu
const PURCHASE_RE = /^kupovina\s+/iu
const INSTALLMENT_RE = /^naplata obroka (\d+) od (\d+)\s+/iu
const CARD_NO_RE = /\d{0,2}\s*broj\s+kartice:.*$/iu
const FEE_RE = /^naknada\b/iu
const INTEREST_RE = /\bkamata\b/iu
const TRANSFER_PREFIX_RE = /^kreditni transfer.*?\(m-zaba\)\s*(?:-\s*instant\s*)?/iu
const DIRECT_DEBIT_PREFIX_RE = /^izvršenje izravnog terećenja\s*/iu

type CategorizeFn = (description: string) => string

type Section = 'none' | 'current' | 'foreign' | 'loan'

interface PendingRow {
  date: string
  amountCents: number
  inflow: boolean
  text: string
}

export function isZabaStatement(lines: TextLine[]): boolean {
  const texts = lines.map(lineText)
  return (
    texts.some((text) => text.startsWith('Zagrebačka banka d.d.')) &&
    texts.some((text) => /Opis prometa/u.test(text) && /Odljev/u.test(text))
  )
}

function isoDate(raw: string): string | null {
  const match = raw.match(DATE_RE)
  if (!match) return null
  const [, dd, mm, yyyy] = match
  return `${yyyy}-${mm}-${dd}`
}

function amountOf(line: TextLine): { cents: number; inflow: boolean } | null {
  const cell = line.find(
    (c) => c.x >= COL.amountMin && c.x < COL.amountMax && AMOUNT_RE.test(c.text),
  )
  if (!cell) return null
  return { cents: parseHrAmount(cell.text), inflow: cell.x < COL.outflowMin }
}

function descriptionOf(line: TextLine): string {
  return line
    .filter((c) => c.x >= COL.descMin && c.x < COL.amountMin)
    .map((c) => c.text)
    .join(' ')
}

/** Account holder name from the address block; card rows end with it. */
function findHolder(lines: TextLine[]): string | null {
  for (const line of lines.slice(0, 20)) {
    const cell = line.find((c) => c.x >= COL.holderMin && c.x < COL.holderMax)
    if (cell && HOLDER_RE.test(cell.text) && !/\d/.test(cell.text)) return cell.text.trim()
  }
  return null
}

function stripHolder(text: string, holder: string | null): string {
  if (!holder || !text.endsWith(holder)) return text
  return text.slice(0, -holder.length).trim()
}

function cleanCardMerchant(text: string): string {
  return text.replace(/\s+(?:\d{2})?[A-Z]{2}$/u, '').trim()
}

function transferParts(text: string): { merchant: string; note?: string } {
  const body = text.replace(TRANSFER_PREFIX_RE, '').replace(DIRECT_DEBIT_PREFIX_RE, '')
  const iban = body.match(IBAN_RE)
  if (!iban || iban.index == null) return { merchant: body }
  const merchant = body.slice(0, iban.index).trim()
  const purpose = body
    .slice(iban.index + iban[0].length)
    .replace(/^\s*HR\d{2}\s+\S+/u, '')
    .trim()
  return { merchant: merchant || body, note: purpose || undefined }
}

export function parseZabaLines(
  lines: TextLine[],
  categorize: CategorizeFn = categorizeDescription,
): ImportParseResult {
  const skipped: ImportSkipped = {}
  const drafts: ParsedImportRowDraft[] = []
  const holder = findHolder(lines)
  const loanKinds = new Map<string, string>()

  let section: Section = 'none'
  let loanAccount: string | null = null
  let row: PendingRow | null = null

  function finish() {
    if (!row) return
    const current = row
    row = null

    const full = stripHolder(current.text.replace(/\s+/g, ' ').trim(), holder)
    const ref = full.match(REF_RE)
    const externalId = ref ? full.slice(0, ref[0].length).trim() : undefined
    const type = ref?.[1]
    const text = ref ? full.slice(ref[0].length) : full

    if (TOP_UP_RE.test(text)) {
      countSkip(skipped, 'transfer')
      return
    }
    if (current.inflow && type !== 'B') {
      countSkip(skipped, 'income')
      return
    }
    if (!current.inflow && CARD_BILL_RE.test(text)) {
      countSkip(skipped, 'payment')
      return
    }

    let merchant = text
    let note: string | undefined
    let category: string | null = null

    const installment = text.match(INSTALLMENT_RE)
    if (LOAN_RE.test(text)) {
      const account = [...loanKinds.keys()].find((id) => text.includes(id))
      merchant = 'Otplata kredita'
      note = account ? loanKinds.get(account) : undefined
      category = 'loans'
    } else if (CASH_RE.test(text)) {
      merchant = text.replace(ATM_PREFIX_RE, 'Bankomat ')
      category = 'cash'
    } else if (PURCHASE_RE.test(text)) {
      merchant = cleanCardMerchant(text.replace(PURCHASE_RE, ''))
    } else if (installment) {
      merchant = text.slice(installment[0].length).replace(CARD_NO_RE, '').trim()
      note = `rata ${installment[1]}/${installment[2]}`
    } else if (FEE_RE.test(text)) {
      category = 'subscriptions'
    } else if (INTEREST_RE.test(text)) {
      category = 'loans'
    } else if (TRANSFER_PREFIX_RE.test(text) || DIRECT_DEBIT_PREFIX_RE.test(text)) {
      const parts = transferParts(text)
      merchant = parts.merchant
      note = parts.note
    }

    drafts.push({
      date: current.date,
      amountCents: current.inflow ? -current.amountCents : current.amountCents,
      merchant,
      source: 'zaba',
      category: category ?? categorize(txnDescription({ merchant, note })),
      note,
      externalId,
    })
  }

  for (const line of lines) {
    const text = lineText(line)
    const first = line[0]

    const loan = first ? first.text.match(LOAN_ACCOUNT_RE) : null
    if (loan) {
      finish()
      loanAccount = loan[1]!
      continue
    }
    if (/POČETNO STANJE/u.test(text)) {
      finish()
      const kind = text.match(LOAN_KIND_RE)
      if (kind && loanAccount) {
        loanKinds.set(loanAccount, kind[1]!)
        section = 'loan'
      } else if (/Tekući račun/iu.test(text)) {
        section = /\bEUR\b/u.test(text) ? 'current' : 'foreign'
      } else {
        section = 'none'
      }
      loanAccount = null
      continue
    }
    if (/^(Zbroj prometa|NOVO STANJE)/u.test(text)) {
      finish()
      if (text.startsWith('NOVO STANJE')) section = 'none'
      continue
    }
    if (section !== 'current' && section !== 'foreign') continue

    const date = first && first.x < COL.dateMax ? isoDate(first.text) : null
    if (date) {
      finish()
      if (section === 'foreign') {
        countSkip(skipped, 'foreignCurrency')
        continue
      }
      const amount = amountOf(line)
      if (!amount || amount.cents === 0) {
        countSkip(skipped, 'unparseable')
        continue
      }
      row = { date, amountCents: amount.cents, inflow: amount.inflow, text: descriptionOf(line) }
      continue
    }

    if (row && first && first.x >= COL.descMin && first.x < COL.descMax) {
      row.text = `${row.text} ${descriptionOf(line)}`
    }
  }
  finish()

  return { rows: assignImportHashes(drafts), skipped }
}
