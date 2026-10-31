import { categorizeDescription } from '@/domain/categorize'
import { isErsteStatement, parseErsteCardClubLines } from '@/domain/importers/ersteCardClub'
import { isRevolutStatement, parseRevolutPdfLines } from '@/domain/importers/revolutPdf'
import type { ImportParseResult, TextLine } from '@/domain/importers/types'

export type PdfStatementKind = 'erste' | 'revolut'

export interface PdfStatementResult extends ImportParseResult {
  kind: PdfStatementKind
}

export function parsePdfStatement(
  lines: TextLine[],
  categorize: (description: string) => string = categorizeDescription,
): PdfStatementResult {
  if (lines.length === 0) throw new Error('pdf.noText')
  if (isErsteStatement(lines)) return { kind: 'erste', ...parseErsteCardClubLines(lines, categorize) }
  if (isRevolutStatement(lines)) return { kind: 'revolut', ...parseRevolutPdfLines(lines, categorize) }
  throw new Error('pdf.unknown')
}
