import { categorizeDescription } from '@/domain/categorize'
import { isErsteStatement, parseErsteCardClubLines } from '@/domain/importers/ersteCardClub'
import { isRevolutStatement, parseRevolutPdfLines } from '@/domain/importers/revolutPdf'
import type { ImportParseResult, TextLine } from '@/domain/importers/types'
import { isZabaStatement, parseZabaLines } from '@/domain/importers/zaba'

export type PdfStatementKind = 'erste' | 'revolut' | 'zaba'

export interface PdfStatementResult extends ImportParseResult {
  kind: PdfStatementKind
}

export function parsePdfStatement(
  lines: TextLine[],
  categorize: (description: string) => string = categorizeDescription,
): PdfStatementResult {
  if (lines.length === 0) throw new Error('pdf.noText')
  // ZABA rows paying the Erste card quote "Obavijest o troškovima", so ZABA must be checked first.
  if (isZabaStatement(lines)) return { kind: 'zaba', ...parseZabaLines(lines, categorize) }
  if (isErsteStatement(lines)) return { kind: 'erste', ...parseErsteCardClubLines(lines, categorize) }
  if (isRevolutStatement(lines)) return { kind: 'revolut', ...parseRevolutPdfLines(lines, categorize) }
  throw new Error('pdf.unknown')
}
