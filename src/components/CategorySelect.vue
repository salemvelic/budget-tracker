<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Category } from '@/db'
import { effectiveKind, orderedCategories } from '@/domain/categories'

const props = defineProps<{
  categories: Category[]
}>()

const model = defineModel<string>({ required: true })

const { t } = useI18n()
const options = computed(() => {
  const list = orderedCategories(props.categories)
  const income = list.filter(
    ({ category }) => effectiveKind(category.id, props.categories) === 'income',
  )
  const rest = list.filter(
    ({ category }) => effectiveKind(category.id, props.categories) !== 'income',
  )
  return [...rest, ...income]
})
</script>

<template>
  <select v-model="model">
    <option v-for="{ category, parent } in options" :key="category.id" :value="category.id">
      {{ parent ? `\u00a0\u00a0\u00a0${t(category.nameKey)}` : t(category.nameKey) }}
    </option>
  </select>
</template>
