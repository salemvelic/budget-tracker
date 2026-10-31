<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLiveQuery } from '@/composables/useLiveQuery'
import { db } from '@/db'
import { formatEur } from '@/domain/money'
import { dailyAllowanceCents, monthKey, monthRange } from '@/domain/month'
import { monthTotalCents, totalsByCategory } from '@/domain/transactions'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settingsStore = useSettingsStore()
const currentMonth = monthKey()

onMounted(() => {
  void settingsStore.load()
})

const txns = useLiveQuery(async () => {
  const { start, end } = monthRange(currentMonth)
  return db.txns.where('date').between(start, end, true, true).toArray()
}, [])

const spentCents = computed(() => monthTotalCents(txns.value))
const limitCents = computed(() => settingsStore.settings.monthlyLimitCents)
const remainingCents = computed(() => limitCents.value - spentCents.value)
const dailyCents = computed(() => dailyAllowanceCents(limitCents.value, spentCents.value))

const emergencyProgress = computed(() => {
  const target = settingsStore.settings.emergencyTargetCents
  if (target <= 0) return 0
  return Math.min(100, Math.round((settingsStore.settings.emergencySavedCents / target) * 100))
})

const categoryTotals = computed(() => {
  const totals = totalsByCategory(txns.value)
  return Object.entries(totals).sort((a, b) => b[1] - a[1])
})

const categories = useLiveQuery(() => db.categories.toArray(), [])

function categoryLabel(id: string) {
  const category = categories.value.find((item) => item.id === id)
  return category ? t(category.nameKey) : id
}

const remainingClass = computed(() =>
  remainingCents.value < 0 ? 'text-danger' : remainingCents.value < limitCents.value * 0.1 ? 'text-warning' : 'text-success',
)
</script>

<template>
  <div class="space-y-6">
    <section class="grid gap-4 sm:grid-cols-2">
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.monthSpend') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatEur(spentCents) }}</p>
        <p class="mt-2 text-sm text-muted">
          {{ t('dashboard.monthLimit') }}:
          <span class="tabular-nums text-foreground">{{ formatEur(limitCents) }}</span>
        </p>
      </article>
      <article class="rounded-xl border border-border bg-surface-muted p-4">
        <p class="text-sm text-muted">{{ t('dashboard.remaining') }}</p>
        <p class="mt-1 text-2xl font-semibold tabular-nums" :class="remainingClass">
          {{ formatEur(remainingCents) }}
        </p>
        <p class="mt-2 text-sm text-muted">
          {{ t('dashboard.dailyAllowance') }}:
          <span class="tabular-nums text-foreground">{{ formatEur(dailyCents) }}</span>
        </p>
      </article>
    </section>

    <section class="rounded-xl border border-border bg-surface-muted p-4">
      <div class="flex items-center justify-between gap-3">
        <p class="font-medium">{{ t('dashboard.emergencyFund') }}</p>
        <p class="text-sm tabular-nums text-muted">
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
          <span class="tabular-nums font-medium">{{ formatEur(cents) }}</span>
        </li>
      </ul>
      <p v-else class="text-sm text-muted">—</p>
    </section>
  </div>
</template>
