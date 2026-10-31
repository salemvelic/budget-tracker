<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MonthPicker from '@/components/MonthPicker.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category, type Txn } from '@/db'
import { formatEur } from '@/domain/money'
import { dailyAllowanceCents, monthKey, monthRange } from '@/domain/month'
import { monthTotalCents, totalsByCategory } from '@/domain/transactions'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
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

const spentCents = computed(() => monthTotalCents(txns.value))
const limitCents = computed(() => settingsStore.settings.monthlyLimitCents)
const remainingCents = computed(() => limitCents.value - spentCents.value)
const dailyCents = computed(() => dailyAllowanceCents(limitCents.value, spentCents.value))

const emergencyProgress = computed(() => {
  const target = settingsStore.settings.emergencyTargetCents
  if (target <= 0) return 0
  return Math.min(100, Math.round((settingsStore.settings.emergencySavedCents / target) * 100))
})

const categoryTotals = computed(() =>
  Object.entries(totalsByCategory(txns.value)).sort((a, b) => b[1] - a[1]),
)

function categoryLabel(id: string) {
  const category = categories.value.find((item) => item.id === id)
  return category ? t(category.nameKey) : id
}

const remainingClass = computed(() => {
  if (remainingCents.value < 0) return 'text-danger'
  return remainingCents.value < limitCents.value * 0.1 ? 'text-warning' : 'text-success'
})
</script>

<template>
  <div class="space-y-6">
    <MonthPicker v-model="selectedMonth" />

    <section class="grid gap-4 sm:grid-cols-2">
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.monthSpend') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatEur(spentCents) }}</p>
        <p class="mt-2 text-sm text-muted">
          {{ t('dashboard.monthLimit') }}:
          <span class="text-foreground tabular-nums">{{ formatEur(limitCents) }}</span>
        </p>
      </article>
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.remaining') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums" :class="remainingClass">
          {{ formatEur(remainingCents) }}
        </p>
        <p v-if="isCurrentMonth" class="mt-2 text-sm text-muted">
          {{ t('dashboard.dailyAllowance') }}:
          <span class="text-foreground tabular-nums">{{ formatEur(dailyCents) }}</span>
        </p>
      </article>
    </section>

    <section class="rounded-xl border border-border bg-surface-muted p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="font-medium">{{ t('dashboard.emergencyFund') }}</p>
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
    </section>

    <section class="rounded-xl border border-border bg-surface-muted p-4">
      <h2 class="mb-3 font-medium">{{ t('dashboard.byCategory') }}</h2>
      <ul v-if="categoryTotals.length" class="space-y-2">
        <li v-for="[categoryId, cents] in categoryTotals" :key="categoryId" class="flex justify-between text-sm">
          <span>{{ categoryLabel(categoryId) }}</span>
          <span class="font-medium tabular-nums">{{ formatEur(cents) }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">{{ t('dashboard.noSpend') }}</p>
    </section>
  </div>
</template>
