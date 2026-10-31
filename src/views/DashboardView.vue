<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MonthPicker from '@/components/MonthPicker.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category, type Txn, type TxnSource } from '@/db'
import { latestImportDates } from '@/db/txns'
import { rollupTotals, spendingCategories, topLevelId } from '@/domain/categories'
import { monthCoverage } from '@/domain/coverage'
import { formatEur } from '@/domain/money'
import { dailyAllowanceCents, formatIsoDate, monthKey, monthRange, todayIso } from '@/domain/month'
import { monthPlan } from '@/domain/plan'
import { totalsByCategory } from '@/domain/transactions'
import { useSettingsStore } from '@/stores/settings'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const selectedMonth = ref(monthKey())
const isCurrentMonth = computed(() => selectedMonth.value === monthKey())

onMounted(() => {
  void settingsStore.load()
})

const txns = useLiveQuery(
  async () => {
    const { start, end } = monthRange(selectedMonth.value)
    return db.txns.where('date').between(start, end, true, true).toArray()
  },
  [] as Txn[],
  selectedMonth,
)
const categories = useLiveQuery(() => db.categories.toArray(), [] as Category[])
const latest = useLiveQuery(latestImportDates, {} as Partial<Record<TxnSource, string>>)

const totals = computed(() => totalsByCategory(txns.value))
const plan = computed(() => monthPlan(categories.value, totals.value, settingsStore.settings.monthlyLimitCents))
const dailyCents = computed(() => dailyAllowanceCents(plan.value.flexibleLeftCents, 0))
const coverage = computed(() => monthCoverage(latest.value, selectedMonth.value, todayIso()))

const emergencyProgress = computed(() => {
  const target = settingsStore.settings.emergencyTargetCents
  if (target <= 0) return 0
  return Math.min(100, Math.round((settingsStore.settings.emergencySavedCents / target) * 100))
})

const categoryTotals = computed(() => {
  const savingsIds = new Set(
    categories.value.filter((category) => !spendingCategories(categories.value).includes(category)).map((c) => c.id),
  )
  const rolled = rollupTotals(totals.value, categories.value)
  return Object.entries(rolled)
    .filter(([id]) => !savingsIds.has(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id, cents]) => ({
      id,
      cents,
      children: Object.entries(totals.value)
        .filter(([childId]) => childId !== id && topLevelId(childId, categories.value) === id)
        .sort((a, b) => b[1] - a[1]),
      ownCents: totals.value[id] ?? 0,
    }))
})

function nameOf(id: string) {
  const category = categories.value.find((item) => item.id === id)
  return category ? t(category.nameKey) : id
}

const remainingClass = computed(() => {
  const { remainingCents, limitCents } = plan.value
  if (remainingCents < 0) return 'text-danger'
  return remainingCents < limitCents * 0.1 ? 'text-warning' : 'text-success'
})
</script>

<template>
  <div class="space-y-6">
    <MonthPicker v-model="selectedMonth" />

    <section class="grid gap-4 sm:grid-cols-2">
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.monthSpend') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatEur(plan.spentCents) }}</p>
        <p v-if="plan.fixedSpentCents" class="mt-1 text-sm text-muted">
          {{ t('dashboard.fixedPart') }}: <span class="tabular-nums">{{ formatEur(plan.fixedSpentCents) }}</span>
        </p>
        <p class="mt-2 text-sm text-muted">
          {{ t('dashboard.monthLimit') }}:
          <span class="text-foreground tabular-nums">{{ formatEur(plan.limitCents) }}</span>
          <span v-if="plan.usesCategoryBudgets"> ({{ t('dashboard.limitFromBudgets') }})</span>
        </p>
      </article>
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.remaining') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums" :class="remainingClass">
          {{ formatEur(plan.remainingCents) }}
        </p>
        <p v-if="plan.fixedReservedCents" class="mt-1 text-sm text-muted">
          {{ t('dashboard.flexibleLeft') }}:
          <span class="text-foreground tabular-nums">{{ formatEur(plan.flexibleLeftCents) }}</span>
        </p>
        <p v-if="isCurrentMonth" class="mt-2 text-sm text-muted">
          {{ t('dashboard.dailyAllowance') }}:
          <span class="text-foreground tabular-nums">{{ formatEur(dailyCents) }}</span>
        </p>
      </article>
    </section>

    <section v-if="coverage.length" class="rounded-xl border border-border bg-surface-muted p-4 text-sm">
      <p class="font-medium">{{ t('dashboard.coverageHeading') }}</p>
      <ul class="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        <li v-for="item in coverage" :key="item.source" :class="item.missingEnd ? 'text-warning' : 'text-muted'">
          {{ t(`transactions.sources.${item.source}`) }}:
          <span class="tabular-nums">{{ formatIsoDate(item.lastDate, locale) }}</span>
        </li>
      </ul>
      <p v-if="coverage.some((item) => item.missingEnd)" class="mt-2 text-xs text-warning">
        {{ t('dashboard.coverageIncomplete') }}
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.savedThisMonth') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatEur(plan.savedCents) }}</p>
      </article>
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-muted">{{ t('dashboard.emergencyFund') }}</p>
          <p class="text-sm text-muted tabular-nums">
            {{
              t('dashboard.emergencyProgress', {
                saved: formatEur(settingsStore.settings.emergencySavedCents),
                target: formatEur(settingsStore.settings.emergencyTargetCents),
              })
            }}
          </p>
        </div>
        <div class="mt-3 h-3 overflow-hidden rounded-full bg-surface">
          <div class="h-full rounded-full bg-brand transition-all" :style="{ width: `${emergencyProgress}%` }" />
        </div>
      </article>
    </section>

    <section class="rounded-xl border border-border bg-surface-muted p-4">
      <h2 class="mb-3 font-medium">{{ t('dashboard.byCategory') }}</h2>
      <ul v-if="categoryTotals.length" class="space-y-2">
        <li v-for="row in categoryTotals" :key="row.id" class="text-sm">
          <div class="flex justify-between">
            <span>{{ nameOf(row.id) }}</span>
            <span class="font-medium tabular-nums">{{ formatEur(row.cents) }}</span>
          </div>
          <ul v-if="row.children.length" class="mt-1 space-y-0.5 pl-4 text-xs text-muted">
            <li v-for="[childId, cents] in row.children" :key="childId" class="flex justify-between">
              <span>{{ nameOf(childId) }}</span>
              <span class="tabular-nums">{{ formatEur(cents) }}</span>
            </li>
            <li v-if="row.ownCents" class="flex justify-between">
              <span>{{ t('dashboard.unassigned') }}</span>
              <span class="tabular-nums">{{ formatEur(row.ownCents) }}</span>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ t('dashboard.noSpend') }}</p>
    </section>
  </div>
</template>
