<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import type { Category, Txn, TxnSource } from '@/db'
import { formatAmountInput, parseHrAmount } from '@/domain/money'
import { todayIso } from '@/domain/month'
import { validateTxnInput, type TxnInput } from '@/domain/transactions'

const props = defineProps<{
  categories: Category[]
  initial?: Txn | null
}>()

const emit = defineEmits<{
  save: [input: TxnInput]
  cancel: []
}>()

const { t, te } = useI18n()

const submitAttempted = ref(false)
const touched = reactive({
  date: false,
  amount: false,
  merchant: false,
})

const form = reactive({
  date: props.initial?.date ?? todayIso(),
  amount: props.initial ? formatAmountInput(props.initial.amountCents) : '',
  merchant: props.initial?.merchant ?? '',
  source: (props.initial?.source ?? 'kartica') as TxnSource,
  category: props.initial?.category ?? 'food',
  note: props.initial?.note ?? '',
})

function validationCode(): string {
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
    return e instanceof Error ? e.message : 'form.invalid'
  }
}

const validationError = computed(() => validationCode())

const visibleError = computed(() => {
  if (!validationError.value) return ''
  const show =
    submitAttempted.value || touched.date || touched.amount || touched.merchant
  if (!show) return ''
  const code = validationError.value
  const key = `transactions.errors.${code}`
  return te(key) ? t(key) : t('transactions.form.invalid')
})

const canSubmit = computed(() => validationError.value === '')

watch(
  () => props.initial,
  (txn) => {
    submitAttempted.value = false
    touched.date = false
    touched.amount = false
    touched.merchant = false
    form.date = txn?.date ?? todayIso()
    form.amount = txn ? formatAmountInput(txn.amountCents) : ''
    form.merchant = txn?.merchant ?? ''
    form.source = txn?.source ?? 'kartica'
    form.category = txn?.category ?? 'food'
    form.note = txn?.note ?? ''
  },
)

function submit() {
  submitAttempted.value = true
  if (!canSubmit.value) return
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
        <input
          v-model="form.date"
          type="date"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2"
          @blur="touched.date = true"
        />
      </label>
      <label class="block space-y-1 text-sm">
        <span class="text-muted">{{ t('transactions.form.amount') }}</span>
        <input
          v-model="form.amount"
          type="text"
          inputmode="decimal"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums"
          :placeholder="t('transactions.form.amountPlaceholder')"
          @blur="touched.amount = true"
        />
      </label>
      <label class="block space-y-1 text-sm sm:col-span-2">
        <span class="text-muted">{{ t('transactions.form.merchant') }}</span>
        <input
          v-model="form.merchant"
          type="text"
          class="w-full rounded-lg border border-border bg-surface px-3 py-2"
          @blur="touched.merchant = true"
        />
      </label>
      <label class="block space-y-1 text-sm">
        <span class="text-muted">{{ t('transactions.form.source') }}</span>
        <select v-model="form.source" class="w-full rounded-lg border border-border bg-surface px-3 py-2">
          <option value="kartica">{{ t('transactions.sources.kartica') }}</option>
          <option value="revolut">{{ t('transactions.sources.revolut') }}</option>
          <option value="zaba">{{ t('transactions.sources.zaba') }}</option>
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

    <p v-if="visibleError" class="text-sm text-danger">{{ visibleError }}</p>

    <div class="flex flex-wrap gap-2">
      <button
        type="submit"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
        :disabled="!canSubmit"
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
