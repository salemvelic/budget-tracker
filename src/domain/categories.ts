import type { Category } from '@/db'

export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'food', nameKey: 'categories.food' },
  { id: 'fuel', nameKey: 'categories.fuel' },
  { id: 'transport', nameKey: 'categories.transport' },
  { id: 'utilities', nameKey: 'categories.utilities' },
  { id: 'shopping', nameKey: 'categories.shopping' },
  { id: 'subscriptions', nameKey: 'categories.subscriptions' },
  { id: 'cash', nameKey: 'categories.cash' },
  { id: 'other', nameKey: 'categories.other' },
]

export function isKnownCategoryId(id: string, categories: Category[]): boolean {
  return categories.some((category) => category.id === id)
}
