import type { CategoryRule } from '@/db'

export const DEFAULT_CATEGORY_RULES: Pick<CategoryRule, 'pattern' | 'category'>[] = [
  { pattern: 'konzum|lidl|plodine|spar|orchard|grocers', category: 'food' },
  { pattern: 'ina|petrol|tifon|fuel', category: 'fuel' },
  { pattern: 'hep|vodovod|toplinar|utility|režij', category: 'utilities' },
  { pattern: 'netflix|spotify|disney|apple', category: 'subscriptions' },
]

export function categorizeDescription(
  description: string,
  rules: Pick<CategoryRule, 'pattern' | 'category'>[] = DEFAULT_CATEGORY_RULES,
): string {
  const text = description.toLowerCase()
  for (const rule of rules) {
    if (new RegExp(rule.pattern, 'i').test(text)) {
      return rule.category
    }
  }
  return 'other'
}
