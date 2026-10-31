<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { Category, Txn } from '@/db'
import { formatEur } from '@/domain/money'
import { formatIsoDate } from '@/domain/month'

defineProps<{
  txns: Txn[]
  categories: Category[]
}>()

const emit = defineEmits<{
  edit: [txn: Txn]
  remove: [id: number]
  recategorize: [txn: Txn, category: string]
}>()

const { t, locale } = useI18n()

function confirmRemove(txn: Txn) {
  if (txn.id != null && window.confirm(t('transactions.confirmDelete', { merchant: txn.merchant }))) {
    emit('remove', txn.id)
  }
}

function onCategoryChange(txn: Txn, event: Event) {
  const category = (event.target as HTMLSelectElement).value
  if (category !== txn.category) emit('recategorize', txn, category)
}
</script>

<template>
  <div v-if="txns.length === 0" class="rounded-xl border border-dashed border-border p-6 text-sm text-muted">
    {{ t('transactions.empty') }}
  </div>
  <ul v-else class="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface-muted">
    <li
      v-for="txn in txns"
      :key="txn.id"
      class="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div class="min-w-0 space-y-1">
        <p class="font-medium break-words">{{ txn.merchant }}</p>
        <p class="text-sm text-muted">
          {{ formatIsoDate(txn.date, locale) }} · {{ t(`transactions.sources.${txn.source}`) }}
          <span v-if="txn.note"> · {{ txn.note }}</span>
        </p>
        <select
          :value="txn.category"
          :aria-label="t('transactions.categoryFor', { merchant: txn.merchant })"
          class="rounded-lg border border-border bg-surface px-2 py-1 text-sm"
          @change="onCategoryChange(txn, $event)"
        >
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ t(category.nameKey) }}
          </option>
        </select>
      </div>
      <div class="flex items-center gap-2">
        <span class="font-semibold tabular-nums">{{ formatEur(txn.amountCents) }}</span>
        <button
          type="button"
          class="rounded-lg border border-border px-3 py-1.5 text-sm"
          @click="emit('edit', txn)"
        >
          {{ t('common.edit') }}
        </button>
        <button
          type="button"
          class="rounded-lg border border-border px-3 py-1.5 text-sm text-danger"
          @click="confirmRemove(txn)"
        >
          {{ t('common.delete') }}
        </button>
      </div>
    </li>
  </ul>
</template>
