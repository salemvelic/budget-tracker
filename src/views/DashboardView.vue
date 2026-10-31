<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import CategoryBreakdown, {
  type CategoryBreakdownRow,
} from '@/components/dashboard/CategoryBreakdown.vue'
import IncomeCard from '@/components/dashboard/IncomeCard.vue'
import SavingsCard from '@/components/dashboard/SavingsCard.vue'
import SummaryCards from '@/components/dashboard/SummaryCards.vue'
import MonthPicker from '@/components/MonthPicker.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category, type Txn, type TxnSource } from '@/db'
import { latestImportDates } from '@/db/txns'
import { rollupTotals, spendingCategories, topLevelId } from '@/domain/categories'
import { isSameMerchant } from '@/domain/categorize'
import { backupDue } from '@/domain/backup'
import { monthCoverage } from '@/domain/coverage'
import { formatEur } from '@/domain/money'
import {
  dailyAllowanceCents,
  formatIsoDate,
  monthKey,
  monthRange,
  shiftMonth,
  todayIso,
} from '@/domain/month'
import { monthPlan } from '@/domain/plan'
import { categoryTrends, previousMonthTotals } from '@/domain/trends'
import { totalsByCategory, totalsByMerchant } from '@/domain/transactions'
import { useSettingsStore } from '@/stores/settings'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const selectedMonth = ref(monthKey())
const expandedId = ref<string | null>(null)
const openListId = ref<string | null>(null)
const savingsOpen = ref(false)
const openSavingsMerchant = ref<string | null>(null)
const backupBannerDismissed = ref(false)
const isCurrentMonth = computed(() => selectedMonth.value === monthKey())

watch(selectedMonth, () => {
  expandedId.value = null
  openListId.value = null
  savingsOpen.value = false
  openSavingsMerchant.value = null
})

onMounted(() => {
  void settingsStore.load()
})

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

const categories = useLiveQuery(() => db.categories.toArray(), [] as Category[])
const latest = useLiveQuery(latestImportDates, {} as Partial<Record<TxnSource, string>>)
const allTxnCount = useLiveQuery(async () => db.txns.count(), 0)

const showBackupDue = computed(
  () => settingsStore.loaded && backupDue(settingsStore.settings.lastBackupAt, allTxnCount.value),
)

const totals = computed(() => totalsByCategory(txns.value))
const plan = computed(() =>
  monthPlan(categories.value, totals.value, settingsStore.settings.monthlyLimitCents),
)
const dailyCents = computed(() => dailyAllowanceCents(plan.value.flexibleLeftCents, 0))
const coverage = computed(() => monthCoverage(latest.value, selectedMonth.value, todayIso()))

const emergencyProgress = computed(() => {
  const target = settingsStore.settings.emergencyTargetCents
  if (target <= 0) return 0
  return Math.min(100, Math.round((settingsStore.settings.emergencySavedCents / target) * 100))
})

const nonSpendingCategoryIds = computed(
  () =>
    new Set(
      categories.value
        .filter((category) => !spendingCategories(categories.value).includes(category))
        .map((c) => c.id),
    ),
)

const savingsTxns = computed(() =>
  txns.value.filter((txn) => nonSpendingCategoryIds.value.has(txn.category)),
)
const savingsGroups = computed(() => totalsByMerchant(savingsTxns.value))

const categoryTotals = computed((): CategoryBreakdownRow[] => {
  const rolled = rollupTotals(totals.value, categories.value)
  return Object.entries(rolled)
    .filter(([id]) => !nonSpendingCategoryIds.value.has(id))
    .sort((a, b) => b[1] - a[1])
    .map(([id, cents]) => ({
      id,
      cents,
      children: Object.entries(totals.value)
        .filter(([childId]) => childId !== id && topLevelId(childId, categories.value) === id)
        .sort((a, b) => b[1] - a[1]),
    }))
})

const categoryTrendsById = computed(() => {
  const current = rollupTotals(totals.value, categories.value)
  for (const id of Object.keys(current)) {
    if (nonSpendingCategoryIds.value.has(id)) delete current[id]
  }
  const previous = previousMonthTotals(
    windowTxns.value,
    selectedMonth.value,
    categories.value,
    nonSpendingCategoryIds.value,
  )
  return categoryTrends(current, previous)
})

function onCategoryClick(row: CategoryBreakdownRow) {
  const hasChildren = row.children.length > 0
  if (hasChildren) {
    if (expandedId.value === row.id) {
      expandedId.value = null
      const open = openListId.value
      if (open === row.id || row.children.some(([childId]) => childId === open)) {
        openListId.value = null
      }
    } else {
      expandedId.value = row.id
      openListId.value = null
    }
    return
  }
  expandedId.value = null
  openListId.value = openListId.value === row.id ? null : row.id
}

function onSubcategoryClick(categoryId: string) {
  openListId.value = openListId.value === categoryId ? null : categoryId
}

function onSavingsClick() {
  if (!savingsGroups.value.length) return
  savingsOpen.value = !savingsOpen.value
  if (!savingsOpen.value) openSavingsMerchant.value = null
}

function onSavingsGroupClick(merchant: string) {
  openSavingsMerchant.value =
    openSavingsMerchant.value && isSameMerchant(openSavingsMerchant.value, merchant)
      ? null
      : merchant
}

function isOpenSavingsGroup(merchant: string) {
  return openSavingsMerchant.value != null && isSameMerchant(openSavingsMerchant.value, merchant)
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

    <div
      v-if="showBackupDue && !backupBannerDismissed"
      class="text-warning border-warning/30 bg-surface-muted flex gap-3 rounded-xl border p-4 text-sm"
      role="status"
    >
      <p class="min-w-0 flex-1">
        {{ t('dashboard.backupDue') }}
        <RouterLink to="/settings" class="text-brand ml-1 underline">{{
          t('dashboard.backupDueLink')
        }}</RouterLink>
      </p>
      <button
        type="button"
        class="text-muted hover:text-foreground shrink-0 rounded p-1 leading-none"
        :aria-label="t('dashboard.backupDueDismiss')"
        @click="backupBannerDismissed = true"
      >
        ×
      </button>
    </div>

    <SummaryCards
      :plan="plan"
      :is-current-month="isCurrentMonth"
      :daily-cents="dailyCents"
      :remaining-class="remainingClass"
    />

    <IncomeCard :plan="plan" />

    <section
      v-if="coverage.length"
      class="border-border bg-surface-muted rounded-xl border p-4 text-sm"
    >
      <p class="font-medium">{{ t('dashboard.coverageHeading') }}</p>
      <ul class="mt-2 flex flex-wrap gap-x-6 gap-y-1">
        <li
          v-for="item in coverage"
          :key="item.source"
          :class="item.missingEnd ? 'text-warning' : 'text-muted'"
        >
          {{ t(`transactions.sources.${item.source}`) }}:
          <span class="tabular-nums">{{ formatIsoDate(item.lastDate, locale) }}</span>
        </li>
      </ul>
      <p v-if="coverage.some((item) => item.missingEnd)" class="text-warning mt-2 text-xs">
        {{ t('dashboard.coverageIncomplete') }}
      </p>
    </section>

    <section class="grid gap-4 sm:grid-cols-2">
      <SavingsCard
        :plan="plan"
        :savings-groups="savingsGroups"
        :savings-open="savingsOpen"
        :open-savings-merchant="openSavingsMerchant"
        :is-open-savings-group="isOpenSavingsGroup"
        @savings-click="onSavingsClick"
        @savings-group-click="onSavingsGroupClick"
      />
      <article class="border-border bg-surface-muted rounded-xl border p-4">
        <div class="flex items-center justify-between gap-3">
          <p class="text-muted text-sm">{{ t('dashboard.emergencyFund') }}</p>
          <p class="text-muted text-sm tabular-nums">
            {{
              t('dashboard.emergencyProgress', {
                saved: formatEur(settingsStore.settings.emergencySavedCents),
                target: formatEur(settingsStore.settings.emergencyTargetCents),
              })
            }}
          </p>
        </div>
        <div class="bg-surface mt-3 h-3 overflow-hidden rounded-full">
          <div
            class="bg-brand h-full rounded-full transition-all"
            :style="{ width: `${emergencyProgress}%` }"
          />
        </div>
      </article>
    </section>

    <CategoryBreakdown
      :rows="categoryTotals"
      :trends="categoryTrendsById"
      :categories="categories"
      :txns="txns"
      :expanded-id="expandedId"
      :open-list-id="openListId"
      @category-click="onCategoryClick"
      @subcategory-click="onSubcategoryClick"
    />
  </div>
</template>
