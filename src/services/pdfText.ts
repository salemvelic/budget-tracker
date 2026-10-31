import { groupPageText, type PositionedText } from '@/domain/importers/pdfLines'
import type { TextLine } from '@/domain/importers/types'

function toPositioned(item: unknown): PositionedText | null {
  if (typeof item !== 'object' || item == null) return null
  const record = item as Record<string, unknown>
  const transform = record.transform
  if (typeof record.str !== 'string' || !Array.isArray(transform)) return null
  return {
    text: record.str,
    x: Number(transform[4] ?? 0),
    y: Number(transform[5] ?? 0),
    width: typeof record.width === 'number' ? record.width : 0,
  }
}

export async function extractPdfLines(file: File): Promise<TextLine[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise
  const lines: TextLine[] = []

  for (let page = 1; page <= doc.numPages; page += 1) {
    const content = await (await doc.getPage(page)).getTextContent()
    const items: PositionedText[] = []
    for (const item of content.items) {
      const positioned = toPositioned(item)
      if (positioned) items.push(positioned)
    }
    lines.push(...groupPageText(items))
  }

  return lines
}
