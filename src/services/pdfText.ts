type PdfTextItem = {
  str: string
  transform: number[]
}

const Y_TOLERANCE = 2.5

function isTextItem(item: unknown): item is PdfTextItem {
  if (typeof item !== 'object' || item == null) return false
  const record = item as Record<string, unknown>
  return typeof record.str === 'string' && Array.isArray(record.transform)
}

function groupPageItems(items: PdfTextItem[]): string[] {
  const withText = items.filter((item) => item.str.trim().length > 0)
  withText.sort((a, b) => {
    const ya = a.transform[5] ?? 0
    const yb = b.transform[5] ?? 0
    const dy = yb - ya
    if (Math.abs(dy) > Y_TOLERANCE) return dy
    return (a.transform[4] ?? 0) - (b.transform[4] ?? 0)
  })

  const lines: string[] = []
  let parts: string[] = []
  let currentY: number | null = null

  for (const item of withText) {
    const y = item.transform[5] ?? 0
    if (currentY != null && Math.abs(y - currentY) > Y_TOLERANCE) {
      const line = parts.join(' ').replace(/\s+/g, ' ').trim()
      if (line) lines.push(line)
      parts = []
    }
    currentY = y
    parts.push(item.str.trim())
  }

  const last = parts.join(' ').replace(/\s+/g, ' ').trim()
  if (last) lines.push(last)
  return lines
}

export async function extractPdfLines(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist')
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default

  const buffer = await file.arrayBuffer()
  const doc = await pdfjs.getDocument({ data: buffer }).promise
  const lines: string[] = []

  for (let page = 1; page <= doc.numPages; page += 1) {
    const pdfPage = await doc.getPage(page)
    const content = await pdfPage.getTextContent()
    const items: PdfTextItem[] = []
    for (const item of content.items) {
      if (isTextItem(item)) items.push(item)
    }
    lines.push(...groupPageItems(items))
  }

  return lines
}
