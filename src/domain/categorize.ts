import type { CategoryRule } from '@/db'

export const DEFAULT_CATEGORY_RULES: Pick<CategoryRule, 'pattern' | 'category'>[] = [
  { pattern: 'konzum|lidl|plodine|spar|orchard|grocers', category: 'food' },
  { pattern: 'ina|petrol|tifon|fuel', category: 'fuel' },
  { pattern: 'hep|vodovod|toplinar|utility|režij', category: 'utilities' },
  { pattern: 'netflix|spotify|disney|apple', category: 'subscriptions' },
]

export function matchesCategoryPattern(pattern: string, description: string): boolean {
  try {
    const bounded = `(^|\\W)(?:${pattern})(\\W|$)`
    return new RegExp(bounded, 'i').test(description)
  } catch {
    return false
  }
}

export function categorizeDescription(
  description: string,
  rules: Pick<CategoryRule, 'pattern' | 'category'>[] = DEFAULT_CATEGORY_RULES,
): string {
  for (const rule of rules) {
    if (matchesCategoryPattern(rule.pattern, description)) {
      return rule.category
    }
  }
  return 'other'
}
