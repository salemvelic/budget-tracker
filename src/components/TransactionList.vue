<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { Category, Txn } from '@/db'
import { formatEur } from '@/domain/money'

defineProps<{
  txns: Txn[]
  categories: Category[]
}>()

const emit = defineEmits<{
  edit: [txn: Txn]
  remove: [id: number]
}>()

const { t } = useI18n()

function confirmRemove(txn: Txn) {
  if (txn.id != null && window.confirm(t('transactions.confirmDelete', { merchant: txn.merchant }))) {
    emit('remove', txn.id)
  }
}

function categoryLabel(categories: Category[], id: string) {
  const category = categories.find((item) => item.id === id)
  return category ? t(category.nameKey) : id
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
      <div>
        <p class="font-medium">{{ txn.merchant }}</p>
        <p class="text-sm text-muted">
          {{ txn.date }} · {{ categoryLabel(categories, txn.category) }} ·
          {{ t(`transactions.sources.${txn.source}`) }}
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="tabular-nums font-semibold">{{ formatEur(txn.amountCents) }}</span>
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
