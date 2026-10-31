<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MonthPicker from '@/components/MonthPicker.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category, type Txn } from '@/db'
import { budgetStatus, totalBudgetCents } from '@/domain/budget'
import { orderedCategories, rollupTotals, spendingCategories } from '@/domain/categories'
import { formatAmountInput, formatEur, parseHrAmount } from '@/domain/money'
import { monthKey, monthRange, shiftMonth } from '@/domain/month'
import { categoryTrends, previousMonthTotals, suggestedBudgetCents } from '@/domain/trends'
import { totalsByCategory } from '@/domain/transactions'

const { t } = useI18n()
const selectedMonth = ref(monthKey())

const categories = useLiveQuery(() => db.categories.toArray(), [] as Category[])
const windowTxns = useLiveQuery(
  async () => {
    const start = monthRange(shiftMonth(selectedMonth.value, -3)).start
    const end = monthRange(selectedMonth.value).end
    return db.txns.where('date').between(start, end, true, true).toArray()
  },
  [] as Txn[],
  selectedMonth,
)
const txns = computed(() => {
  const { start, end } = monthRange(selectedMonth.value)
  return windowTxns.value.filter((txn) => txn.date >= start && txn.date <= end)
})

const nonSpendingCategoryIds = computed(
  () =>
    new Set(
      categories.value
        .filter((category) => !spendingCategories(categories.value).includes(category))
        .map((c) => c.id),
    ),
)

const avgTrendsByCategory = computed(() =>
  categoryTrends(
    {},
    previousMonthTotals(
      windowTxns.value,
      selectedMonth.value,
      categories.value,
      nonSpendingCategoryIds.value,
    ),
  ),
)

function budgetSuggestionCents(categoryId: string): number {
  return suggestedBudgetCents(avgTrendsByCategory.value[categoryId]?.avg3Cents ?? 0)
}

function showBudgetSuggestion(row: (typeof rows.value)[number]) {
  const suggested = budgetSuggestionCents(row.id)
  return suggested > 0 && suggested !== (row.budgetCents ?? 0)
}

async function applySuggestion(id: string) {
  const cents = budgetSuggestionCents(id)
  if (cents <= 0) return
  inputs[id] = formatAmountInput(cents)
  await saveBudget(id)
}

const totals = computed(() => totalsByCategory(txns.value))
const spending = computed(() =>
  orderedCategories(spendingCategories(categories.value))
    .filter(({ parent }) => !parent)
    .map(({ category }) => category),
)
const rows = computed(() =>
  budgetStatus(spending.value, rollupTotals(totals.value, categories.value)),
)
const totalBudget = computed(() => totalBudgetCents(spending.value))

function childTotals(parentId: string) {
  return categories.value
    .filter((category) => category.parentId === parentId && totals.value[category.id])
    .map((category) => ({
      id: category.id,
      nameKey: category.nameKey,
      cents: totals.value[category.id]!,
    }))
}
const fixedIds = computed(
  () => new Set(spending.value.filter((c) => c.kind === 'fixed').map((c) => c.id)),
)

async function setFixed(id: string, fixed: boolean) {
  await db.categories.update(id, { kind: fixed ? 'fixed' : undefined })
}

const inputs = reactive<Record<string, string>>({})
const invalid = reactive<Record<string, boolean>>({})

watch(
  categories,
  (list) => {
    for (const category of list) {
      if (!(category.id in inputs)) {
        inputs[category.id] = category.budgetCents ? formatAmountInput(category.budgetCents) : ''
      }
    }
  },
  { immediate: true },
)

async function saveBudget(id: string) {
  const raw = (inputs[id] ?? '').trim()
  try {
    const cents = raw ? parseHrAmount(raw) : 0
    if (cents < 0) throw new Error('amount.invalid')
    invalid[id] = false
    await db.categories.update(id, { budgetCents: cents > 0 ? cents : undefined })
    inputs[id] = cents > 0 ? formatAmountInput(cents) : ''
  } catch {
    invalid[id] = true
  }
}
</script>

<template>
  <div class="space-y-6">
    <MonthPicker v-model="selectedMonth" />

    <section class="border-border bg-surface-muted space-y-4 rounded-xl border p-4">
      <div class="flex items-baseline justify-between gap-3">
        <p class="text-muted text-sm">{{ t('budget.help') }}</p>
        <p class="text-sm whitespace-nowrap">
          {{ t('budget.total') }}:
          <span class="font-medium tabular-nums">{{ formatEur(totalBudget) }}</span>
        </p>
      </div>

      <ul class="space-y-4">
        <li v-for="row in rows" :key="row.id" class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <span class="font-medium">{{ t(row.nameKey) }}</span>
            <label class="text-muted ml-auto flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                :checked="fixedIds.has(row.id)"
                @change="setFixed(row.id, ($event.target as HTMLInputElement).checked)"
              />
              {{ t('budget.fixed') }}
            </label>
            <label class="flex items-center gap-2 text-sm">
              <span class="text-muted">{{ t('budget.limit') }}</span>
              <input
                v-model="inputs[row.id]"
                type="text"
                inputmode="decimal"
                :placeholder="t('budget.noLimit')"
                class="bg-surface w-28 rounded-lg border px-2 py-1 text-right tabular-nums"
                :class="invalid[row.id] ? 'border-danger' : 'border-border'"
                @change="saveBudget(row.id)"
              />
            </label>
          </div>
          <div v-if="row.budgetCents != null" class="bg-surface h-2 overflow-hidden rounded-full">
            <div
              class="h-full rounded-full transition-all"
              :class="row.over ? 'bg-danger' : 'bg-brand'"
              :style="{ width: `${row.percent}%` }"
            />
          </div>
          <p
            v-if="showBudgetSuggestion(row)"
            class="text-muted flex flex-wrap items-center gap-2 text-xs"
          >
            {{ t('budget.suggested', { amount: formatEur(budgetSuggestionCents(row.id)) }) }}
            <button type="button" class="text-brand underline" @click="applySuggestion(row.id)">
              {{ t('budget.applySuggestion') }}
            </button>
          </p>
          <p class="text-muted text-xs tabular-nums">
            {{ t('budget.spent') }} {{ formatEur(row.spentCents) }}
            <template v-if="row.remainingCents != null">
              ·
              <span :class="row.over ? 'text-danger' : ''">
                {{ row.over ? t('budget.over') : t('budget.left') }}
                {{ formatEur(Math.abs(row.remainingCents)) }}
              </span>
            </template>
          </p>
          <p v-if="childTotals(row.id).length" class="text-muted text-xs tabular-nums">
            <template v-for="(child, index) in childTotals(row.id)" :key="child.id">
              <span v-if="index > 0"> · </span>{{ t(child.nameKey) }} {{ formatEur(child.cents) }}
            </template>
          </p>
        </li>
      </ul>
    </section>
  </div>
</template>
