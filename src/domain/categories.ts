import type { Category, CategoryKind } from '@/db'

/** Parents come before their children; selects and lists keep this order. */
export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', nameKey: 'categories.food' },
  { id: 'groceries', nameKey: 'categories.groceries', parentId: 'food' },
  { id: 'restaurants', nameKey: 'categories.restaurants', parentId: 'food' },
  { id: 'going_out', nameKey: 'categories.going_out' },
  { id: 'bars', nameKey: 'categories.bars', parentId: 'going_out' },
  { id: 'entertainment', nameKey: 'categories.entertainment', parentId: 'going_out' },
  { id: 'travel', nameKey: 'categories.travel' },
  { id: 'fuel', nameKey: 'categories.fuel' },
  { id: 'transport', nameKey: 'categories.transport' },
  { id: 'utilities', nameKey: 'categories.utilities' },
  { id: 'shopping', nameKey: 'categories.shopping' },
  { id: 'subscriptions', nameKey: 'categories.subscriptions' },
  { id: 'cash', nameKey: 'categories.cash' },
  { id: 'loans', nameKey: 'categories.loans', kind: 'fixed' },
  { id: 'savings', nameKey: 'categories.savings', kind: 'savings' },
  { id: 'other', nameKey: 'categories.other' },
]

export function isKnownCategoryId(id: string, categories: Category[]): boolean {
  return categories.some((category) => category.id === id)
}

/** Top-level id for a category (itself when it has no parent). */
export function topLevelId(id: string, categories: Category[]): string {
  return categories.find((category) => category.id === id)?.parentId ?? id
}

export function topLevelCategories(categories: Category[]): Category[] {
  return categories.filter((category) => !category.parentId)
}

/** Kind of a category, inherited from its parent. */
export function effectiveKind(id: string, categories: Category[]): CategoryKind | undefined {
  return categories.find((category) => category.id === topLevelId(id, categories))?.kind
}

/** Categories that count as spending (everything except savings). */
export function spendingCategories(categories: Category[]): Category[] {
  return categories.filter((category) => effectiveKind(category.id, categories) !== 'savings')
}

/** Totals per top-level category, with subcategory amounts added to their parent. */
export function rollupTotals(
  totals: Record<string, number>,
  categories: Category[],
): Record<string, number> {
  const rolled: Record<string, number> = {}
  for (const [id, cents] of Object.entries(totals)) {
    const top = topLevelId(id, categories)
    rolled[top] = (rolled[top] ?? 0) + cents
  }
  return rolled
}

export interface CategoryOption {
  category: Category
  parent?: Category
}

const DEFAULT_ORDER = new Map(DEFAULT_CATEGORIES.map((category, index) => [category.id, index]))

function byDefaultOrder(a: Category, b: Category): number {
  const rank = (category: Category) =>
    DEFAULT_ORDER.get(category.id) ?? DEFAULT_CATEGORIES.length - 1.5
  return rank(a) - rank(b) || a.id.localeCompare(b.id)
}

/** Parents followed by their children in the default order (unknown ones just before Other). */
export function orderedCategories(categories: Category[]): CategoryOption[] {
  const ids = new Set(categories.map((category) => category.id))
  const sorted = [...categories].sort(byDefaultOrder)
  const tops = sorted.filter((category) => !category.parentId || !ids.has(category.parentId))
  return tops.flatMap((parent) => [
    { category: parent },
    ...sorted
      .filter((child) => child.parentId === parent.id)
      .map((child) => ({ category: child, parent })),
  ])
}
