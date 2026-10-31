import type { Ref } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Category } from '@/db'

/** "Hrana › Namirnice" for subcategories, plain name for top-level ones, the raw id if unknown. */
export function useCategoryLabel(categories: Ref<Category[]>) {
  const { t } = useI18n()
  return (id: string): string => {
    const category = categories.value.find((item) => item.id === id)
    if (!category) return id
    const parent = category.parentId ? categories.value.find((item) => item.id === category.parentId) : undefined
    return parent ? `${t(parent.nameKey)} › ${t(category.nameKey)}` : t(category.nameKey)
  }
}
