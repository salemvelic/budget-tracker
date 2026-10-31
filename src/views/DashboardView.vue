<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import MonthPicker from '@/components/MonthPicker.vue'
import DashboardExpenseList from '@/components/DashboardExpenseList.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category, type Txn, type TxnSource } from '@/db'
import { latestImportDates } from '@/db/txns'
import { rollupTotals, spendingCategories, topLevelId } from '@/domain/categories'
import { isSameMerchant } from '@/domain/categorize'
import { monthCoverage } from '@/domain/coverage'
import { formatEur } from '@/domain/money'
import { dailyAllowanceCents, formatIsoDate, monthKey, monthRange, todayIso } from '@/domain/month'
import { monthPlan } from '@/domain/plan'
import { totalsByCategory, totalsByMerchant, txnsInCategory } from '@/domain/transactions'
import { useSettingsStore } from '@/stores/settings'

const { t, locale } = useI18n()
const settingsStore = useSettingsStore()
const selectedMonth = ref(monthKey())
const expandedId = ref<string | null>(null)
const openListId = ref<string | null>(null)
const savingsOpen = ref(false)
const openSavingsMerchant = ref<string | null>(null)
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

const nonSpendingCategoryIds = computed(
  () =>
    new Set(
      categories.value
        .filter((category) => !spendingCategories(categories.value).includes(category))
        .map((c) => c.id),
    ),
)

const savingsTxns = computed(() => txns.value.filter((txn) => nonSpendingCategoryIds.value.has(txn.category)))
const savingsGroups = computed(() => totalsByMerchant(savingsTxns.value))

const categoryTotals = computed(() => {
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

function nameOf(id: string) {
  const category = categories.value.find((item) => item.id === id)
  return category ? t(category.nameKey) : id
}

const openListTxns = computed(() =>
  openListId.value ? txnsInCategory(txns.value, openListId.value) : [],
)

function categoryHasSubrows(row: (typeof categoryTotals.value)[number]) {
  return row.children.length > 0
}

function expensesFor(categoryId: string) {
  return txnsInCategory(txns.value, categoryId)
}

function onCategoryClick(row: (typeof categoryTotals.value)[number]) {
  if (categoryHasSubrows(row)) {
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
    openSavingsMerchant.value && isSameMerchant(openSavingsMerchant.value, merchant) ? null : merchant
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
          <template v-if="plan.limitCents === 0">
            {{ t('dashboard.noLimitHint') }}
          </template>
          <template v-else-if="plan.flexibleLeftCents < 0">
            <span class="text-danger">
              {{ t('dashboard.variableOver', { amount: formatEur(Math.abs(plan.flexibleLeftCents)) }) }}
            </span>
          </template>
          <template v-else>
            {{ t('dashboard.dailyAllowance') }}:
            <span class="text-foreground tabular-nums">{{ formatEur(dailyCents) }}</span>
          </template>
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
        <component
          :is="savingsGroups.length ? 'button' : 'div'"
          :type="savingsGroups.length ? 'button' : undefined"
          class="w-full text-left"
          :class="savingsGroups.length ? 'rounded-lg hover:bg-surface' : ''"
          :aria-expanded="savingsGroups.length ? savingsOpen : undefined"
          :aria-label="savingsGroups.length ? t('dashboard.showSavings') : undefined"
          @click="savingsGroups.length ? onSavingsClick() : undefined"
        >
          <p class="text-sm text-muted">{{ t('dashboard.savedThisMonth') }}</p>
          <div class="mt-1 flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-1">
              <span
                v-if="savingsGroups.length"
                class="inline-block w-4 shrink-0 text-muted transition-transform"
                :class="savingsOpen ? 'rotate-90' : ''"
                aria-hidden="true"
              >
                ›
              </span>
              <span class="text-2xl font-semibold tabular-nums">{{ formatEur(plan.savedCents) }}</span>
            </span>
          </div>
        </component>
        <ul v-if="savingsOpen && savingsGroups.length" class="mt-2 space-y-0.5 text-sm">
          <li v-for="group in savingsGroups" :key="group.merchant">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left text-muted hover:bg-surface"
              :aria-expanded="isOpenSavingsGroup(group.merchant)"
              :aria-label="t('dashboard.showExpenses', { category: group.merchant })"
              @click="onSavingsGroupClick(group.merchant)"
            >
              <span class="min-w-0 break-words">{{ group.merchant }}</span>
              <span class="shrink-0 tabular-nums">{{ formatEur(group.cents) }}</span>
            </button>
            <DashboardExpenseList v-if="isOpenSavingsGroup(group.merchant)" :txns="group.txns" variant="indented" />
          </li>
        </ul>
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
          <button
            type="button"
            class="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left hover:bg-surface"
            :aria-expanded="categoryHasSubrows(row) ? expandedId === row.id : openListId === row.id"
            :aria-label="
              categoryHasSubrows(row)
                ? t('dashboard.showSubcategories', { category: nameOf(row.id) })
                : t('dashboard.showExpenses', { category: nameOf(row.id) })
            "
            @click="onCategoryClick(row)"
          >
            <span class="flex min-w-0 items-center gap-1">
              <span
                v-if="categoryHasSubrows(row)"
                class="inline-block w-4 shrink-0 text-muted transition-transform"
                :class="expandedId === row.id ? 'rotate-90' : ''"
                aria-hidden="true"
              >
                ›
              </span>
              <span v-else class="inline-block w-4 shrink-0" aria-hidden="true" />
              <span>{{ nameOf(row.id) }}</span>
            </span>
            <span class="shrink-0 font-medium tabular-nums">{{ formatEur(row.cents) }}</span>
          </button>
          <DashboardExpenseList
            v-if="openListId === row.id && !categoryHasSubrows(row)"
            :txns="openListTxns"
            variant="leaf"
          />
          <ul v-if="expandedId === row.id" class="mt-1 space-y-0.5 pl-4 text-xs">
            <li v-for="[childId, cents] in row.children" :key="childId">
              <button
                type="button"
                class="flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left text-muted hover:bg-surface"
                :aria-expanded="openListId === childId"
                :aria-label="t('dashboard.showExpenses', { category: nameOf(childId) })"
                @click="onSubcategoryClick(childId)"
              >
                <span>{{ nameOf(childId) }}</span>
                <span class="tabular-nums">{{ formatEur(cents) }}</span>
              </button>
              <DashboardExpenseList
                v-if="openListId === childId"
                :txns="openListTxns"
                variant="indented"
              />
            </li>
            <li v-if="expensesFor(row.id).length">
              <DashboardExpenseList :txns="expensesFor(row.id)" variant="indented" />
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ t('dashboard.noSpend') }}</p>
    </section>
  </div>
</template>
