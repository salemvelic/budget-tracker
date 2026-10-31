<script setup lang="ts">
import { computed, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Category, Txn, TxnSource } from '@/db'
import { formatEur, parseHrAmount } from '@/domain/money'
import { validateTxnInput, type TxnInput } from '@/domain/transactions'

const props = defineProps<{
  categories: Category[]
  initial?: Txn | null
}>()

const emit = defineEmits<{
  save: [input: TxnInput]
  cancel: []
}>()

const { t } = useI18n()

const form = reactive({
  date: props.initial?.date ?? new Date().toISOString().slice(0, 10),
  amount: props.initial ? formatEur(props.initial.amountCents).replace(/\s/g, ' ') : '',
  merchant: props.initial?.merchant ?? '',
  source: (props.initial?.source ?? 'kartica') as TxnSource,
  category: props.initial?.category ?? 'food',
  note: props.initial?.note ?? '',
})

const error = computed(() => {
  try {
    validateTxnInput({
      date: form.date,
      amountCents: parseHrAmount(form.amount),
      merchant: form.merchant,
      source: form.source,
      category: form.category,
      note: form.note,
    })
    return ''
  } catch (e) {
    return e instanceof Error ? e.message : t('transactions.form.invalid')
  }
})

watch(
  () => props.initial,
  (txn) => {
    form.date = txn?.date ?? new Date().toISOString().slice(0, 10)
    form.amount = txn ? formatEur(txn.amountCents) : ''
    form.merchant = txn?.merchant ?? ''
    form.source = txn?.source ?? 'kartica'
    form.category = txn?.category ?? 'food'
    form.note = txn?.note ?? ''
  },
)

function submit() {
  const input = validateTxnInput({
    date: form.date,
    amountCents: parseHrAmount(form.amount),
    merchant: form.merchant,
    source: form.source,
    category: form.category,
    note: form.note,
  })
  emit('save', input)
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-border bg-surface-muted p-4" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-2">
      <label class="block space-y-1 text-sm">
        <span class="text-muted">{{ t('transactions.form.date') }}</span>
        <input v-model="form.date" type="date" class="w-full rounded-lg border border-border bg-surface px-3 py-2" />
      </label>
      <label class="block space-y-1 text-sm">
        <span class="text-muted">{{ t('transactions.form.amount') }}</span>
        <input
          v-model="form.amount"
          type="text"
          inputmode="decimal"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums"
          :placeholder="t('transactions.form.amountPlaceholder')"
        />
      </label>
      <label class="block space-y-1 text-sm sm:col-span-2">
        <span class="text-muted">{{ t('transactions.form.merchant') }}</span>
        <input v-model="form.merchant" type="text" class="w-full rounded-lg border border-border bg-surface px-3 py-2" />
      </label>
      <label class="block space-y-1 text-sm">
        <span class="text-muted">{{ t('transactions.form.source') }}</span>
        <select v-model="form.source" class="w-full rounded-lg border border-border bg-surface px-3 py-2">
          <option value="kartica">{{ t('transactions.sources.kartica') }}</option>
          <option value="revolut">{{ t('transactions.sources.revolut') }}</option>
          <option value="gotovina">{{ t('transactions.sources.gotovina') }}</option>
        </select>
      </label>
      <label class="block space-y-1 text-sm">
        <span class="text-muted">{{ t('transactions.form.category') }}</span>
        <select v-model="form.category" class="w-full rounded-lg border border-border bg-surface px-3 py-2">
          <option v-for="category in categories" :key="category.id" :value="category.id">
            {{ t(category.nameKey) }}
          </option>
        </select>
      </label>
      <label class="block space-y-1 text-sm sm:col-span-2">
        <span class="text-muted">{{ t('transactions.form.note') }}</span>
        <input v-model="form.note" type="text" class="w-full rounded-lg border border-border bg-surface px-3 py-2" />
      </label>
    </div>

    <p v-if="error" class="text-sm text-danger">{{ error }}</p>

    <div class="flex flex-wrap gap-2">
      <button
        type="submit"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        :disabled="Boolean(error)"
      >
        {{ initial ? t('transactions.form.update') : t('transactions.form.add') }}
      </button>
      <button
        v-if="initial"
        type="button"
        class="rounded-lg border border-border px-4 py-2 text-sm font-medium"
        @click="emit('cancel')"
      >
        {{ t('common.cancel') }}
      </button>
    </div>
  </form>
</template>
