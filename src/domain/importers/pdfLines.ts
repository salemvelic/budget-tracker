import type { TextCell, TextLine } from '@/domain/importers/types'

export interface PositionedText {
  text: string
  x: number
  y: number
  width: number
}

const Y_TOLERANCE = 2.5
const MERGE_GAP = 3

function toCells(items: PositionedText[]): TextLine {
  const sorted = [...items].sort((a, b) => a.x - b.x)
  const cells: TextCell[] = []
  let lastEnd = Number.NEGATIVE_INFINITY

  for (const item of sorted) {
    const text = item.text.trim()
    const previous = cells[cells.length - 1]
    if (previous && item.x - lastEnd < MERGE_GAP) {
      previous.text = `${previous.text} ${text}`
    } else {
      cells.push({ x: Math.round(item.x), text })
    }
    lastEnd = item.x + item.width
  }
  return cells
}

/** Group one page's text items into top-to-bottom lines of left-to-right cells. */
export function groupPageText(items: PositionedText[]): TextLine[] {
  const withText = items.filter((item) => item.text.trim().length > 0).sort((a, b) => b.y - a.y)

  const lines: TextLine[] = []
  let bucket: PositionedText[] = []
  let bucketY: number | null = null

  for (const item of withText) {
    if (bucketY != null && Math.abs(item.y - bucketY) > Y_TOLERANCE) {
      lines.push(toCells(bucket))
      bucket = []
    }
    if (bucket.length === 0) bucketY = item.y
    bucket.push(item)
  }
  if (bucket.length > 0) lines.push(toCells(bucket))
  return lines
}

export function lineText(line: TextLine): string {
  return line.map((cell) => cell.text).join(' ')
}
