import type { CategoryRule, Txn } from '@/db'

type Rule = Pick<CategoryRule, 'pattern' | 'category'>

/** Whole-word patterns (alternatives separated by `|`), matched case-insensitively. */
export const DEFAULT_CATEGORY_RULES: Rule[] = [
  {
    pattern:
      'konzum|superkonzum|lidl|plodine|spar|interspar|eurospar|kaufland|studenac|tommy|ribola|billa|carrefour|profi|mega image|mlinar|pekara|orchard|grocers|mcdonald\'s|wolt|glovo|restoran|restaurant|pizzeria|bistro|konoba|caffe|cafe|kafić',
    category: 'food',
  },
  { pattern: 'ina|petrol|tifon|crodux|omv|mol|lukoil|shell|fuel', category: 'fuel' },
  {
    pattern:
      'bolt|uber|yandex|taxi|autoceste|naplatna|parking|ryanair|croatia airlines|easyjet|wizz air|flixbus|hž',
    category: 'transport',
  },
  { pattern: 'hep|vodovod|toplinarstvo|plinara|režije|rezije|telekom|a1|telemach|utility|utilities', category: 'utilities' },
  { pattern: 'amazon|ekupi|emmezeta|ikea|mueller|müller|dm|deichmann|decathlon|zara', category: 'shopping' },
  { pattern: 'netflix|spotify|disney|apple|youtube|hbo|premium plan', category: 'subscriptions' },
]

export function matchesCategoryPattern(pattern: string, description: string): boolean {
  try {
    return new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, 'iu').test(description)
  } catch {
    return false
  }
}

export function categorizeDescription(description: string, rules: Rule[] = DEFAULT_CATEGORY_RULES): string {
  for (const rule of rules) {
    if (matchesCategoryPattern(rule.pattern, description)) {
      return rule.category
    }
  }
  return 'other'
}

/** Returns `rule.empty`, `rule.invalid` or `''` when the pattern is usable. */
export function validateRulePattern(pattern: string): string {
  const trimmed = pattern.trim()
  if (!trimmed) return 'rule.empty'
  try {
    new RegExp(trimmed, 'iu')
  } catch {
    return 'rule.invalid'
  }
  return /^\|+$|\|\||^\||\|$/.test(trimmed) ? 'rule.invalid' : ''
}

/** New categories for transactions still in `other` that now match a rule. */
export function recategorizeOther(
  txns: Pick<Txn, 'id' | 'merchant' | 'category'>[],
  rules: Rule[],
): { id: number; category: string }[] {
  const changes: { id: number; category: string }[] = []
  for (const txn of txns) {
    if (txn.category !== 'other' || txn.id == null) continue
    const category = categorizeDescription(txn.merchant, rules)
    if (category !== 'other') changes.push({ id: txn.id, category })
  }
  return changes
}
