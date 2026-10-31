import type { CategoryRule, Txn } from '@/db'

type Rule = Pick<CategoryRule, 'pattern' | 'category'>

/** Whole-word patterns (alternatives separated by `|`), matched case-insensitively. */
export const DEFAULT_CATEGORY_RULES: Rule[] = [
  {
    pattern:
      "restoran|restaurant|\\p{L}*pizz\\p{L}*|bistro|konoba|street food|burger|kebab|mcdonald's|wolt|glovo",
    category: 'restaurants',
  },
  {
    pattern:
      'konzum|superkonzum|lidl|plodine|spar|interspar|eurospar|kaufland|studenac|tommy|ribola|billa|carrefour|profi|mega image|mlinar|pekara|orchard|grocers|trgovina krk|bakmaz|korzinka',
    category: 'groceries',
  },
  {
    pattern:
      'pub|bar|pivnic\\p{L}*|\\p{L}*beer\\p{L}*|\\p{L}*brew\\p{L}*|\\p{L}*caf(?:e|é)|caffe|kafić|kafic|cuga|\\p{L}*gelater\\p{L}*|rakhia|vinoteka|t5 social',
    category: 'bars',
  },
  {
    pattern:
      'eventim|entrio|ulaznic\\p{L}*|cinestar|cinema|kino|eventbook|koncert\\p{L}*|concert|kazališt\\p{L}*|teatar|theatre|muzej|museum|hajduk|dinamo|utakmic\\p{L}*|stadion|ludaku(?:c|ć)a',
    category: 'entertainment',
  },
  {
    pattern:
      "ryanair|easyjet|wizz ?air|croatia airlines|lufthansa|air ?china|\\p{L}*airlines?|\\p{L}*airways|railways?|temir yo'llari|cfr călători|cfr calatori|hžpp|hž|flixbus|go bus|arriva|booking\\.com|airbnb|hotel|hostel|e-?visa|gov\\.kg|suvenir\\p{L}*|stb bucure\\p{L}*|metrorex",
    category: 'travel',
  },
  { pattern: 'ina|petrol|tifon|crodux|omv|mol|lukoil|shell|fuel|ktc.*?b\\.p\\.', category: 'fuel' },
  { pattern: 'bolt|uber|yandex|taxi|autoceste|naplatna|parking', category: 'transport' },
  {
    pattern: 'hep|vodovod|toplinarstvo|plinara|režije|rezije|telekom|a1|telemach|utility|utilities',
    category: 'utilities',
  },
  {
    pattern:
      'amazon|ekupi|emmezeta|ikea|mueller|müller|dm|deichmann|decathlon|zara|sancta domenica',
    category: 'shopping',
  },
  {
    pattern: 'netflix|spotify|disney|apple|youtube|hbo|premium plan|myheritage',
    category: 'subscriptions',
  },
]

export function matchesCategoryPattern(pattern: string, description: string): boolean {
  try {
    return new RegExp(`(?<!\\p{L})(?:${pattern})(?!\\p{L})`, 'iu').test(description)
  } catch {
    return false
  }
}

export function categorizeDescription(
  description: string,
  rules: Rule[] = DEFAULT_CATEGORY_RULES,
): string {
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

function normalizeMerchant(merchant: string): string {
  return merchant.replace(/\s+/g, ' ').trim().toLowerCase()
}

export function isSameMerchant(a: string, b: string): boolean {
  return normalizeMerchant(a) === normalizeMerchant(b)
}

/** Rule pattern that matches this merchant name literally. */
export function merchantRulePattern(merchant: string): string {
  return normalizeMerchant(merchant).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

const CITY_WORDS = new Set([
  'zagreb',
  'split',
  'rijeka',
  'osijek',
  'zadar',
  'pula',
  'sisak',
  'karlovac',
  'varazdin',
  'varždin',
  'sibenik',
  'šibenik',
  'dubrovnik',
  'velika',
  'gorica',
  'samobor',
  'krizevci',
  'križevci',
  'sveta',
  'nedelja',
])

function isSkippableMerchantToken(token: string): boolean {
  const lower = token.toLowerCase()
  if (/\d/.test(token)) return true
  if (CITY_WORDS.has(lower)) return true
  if (/^[a-z]{2}$/i.test(token)) return true
  if (/\bd\.?o\.?o\.?\b/i.test(token) || /\bd\.d\.?\b/i.test(token)) return true
  return false
}

/** Suggested rule pattern: merchant prefix before store number, city or legal suffix. */
export function suggestedRulePattern(merchant: string): string {
  const tokens = normalizeMerchant(merchant).split(' ')
  const kept: string[] = []
  for (const token of tokens) {
    if (isSkippableMerchantToken(token)) break
    kept.push(token)
  }
  const phrase = kept.length > 0 ? kept.join(' ') : (tokens[0] ?? normalizeMerchant(merchant))
  return phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Text that rules are matched against: merchant plus note (transfer purpose, e.g. a match ticket). */
export function txnDescription(txn: Pick<Txn, 'merchant' | 'note'>): string {
  return txn.note ? `${txn.merchant} ${txn.note}` : txn.merchant
}

const SUBCATEGORY_UPGRADES: Record<string, string[] | '*'> = {
  other: '*',
  food: ['groceries', 'restaurants', 'bars'],
  transport: ['travel'],
}

/**
 * Category for an existing transaction once subcategories exist, or null to keep it.
 * Only moves broad or default placements; anything the user picked elsewhere stays.
 */
export function subcategoryUpgrade(
  txn: Pick<Txn, 'merchant' | 'note' | 'category' | 'categoryLocked'>,
): string | null {
  if (txn.categoryLocked) return null
  const allowed = SUBCATEGORY_UPGRADES[txn.category]
  if (!allowed) return null
  const next = categorizeDescription(txnDescription(txn))
  if (next === txn.category || next === 'other') return null
  return allowed === '*' || allowed.includes(next) ? next : null
}

/** New categories for transactions still in `other` that now match a rule. */
export function recategorizeOther(
  txns: Pick<Txn, 'id' | 'merchant' | 'note' | 'category' | 'categoryLocked'>[],
  rules: Rule[],
): { id: number; category: string }[] {
  const changes: { id: number; category: string }[] = []
  for (const txn of txns) {
    if (txn.categoryLocked || txn.category !== 'other' || txn.id == null) continue
    const category = categorizeDescription(txnDescription(txn), rules)
    if (category !== 'other') changes.push({ id: txn.id, category })
  }
  return changes
}
