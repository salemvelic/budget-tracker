<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { formatEur } from '@/domain/money'
import type { MonthPlan } from '@/domain/plan'

defineProps<{
  plan: MonthPlan
  isCurrentMonth: boolean
  dailyCents: number
  remainingClass: string
}>()

const { t } = useI18n()
</script>

<template>
  <section class="grid gap-4 sm:grid-cols-2">
    <article class="border-border bg-surface-muted rounded-xl border p-4">
      <p class="text-muted text-sm">{{ t('dashboard.monthSpend') }}</p>
      <p class="mt-1 text-2xl font-semibold tabular-nums">{{ formatEur(plan.spentCents) }}</p>
      <p v-if="plan.fixedSpentCents" class="text-muted mt-1 text-sm">
        {{ t('dashboard.fixedPart') }}:
        <span class="tabular-nums">{{ formatEur(plan.fixedSpentCents) }}</span>
      </p>
      <p class="text-muted mt-2 text-sm">
        {{ t('dashboard.monthLimit') }}:
        <span class="text-foreground tabular-nums">{{ formatEur(plan.limitCents) }}</span>
        <span v-if="plan.usesCategoryBudgets"> ({{ t('dashboard.limitFromBudgets') }})</span>
      </p>
    </article>
    <article class="border-border bg-surface-muted rounded-xl border p-4">
      <p class="text-muted text-sm">{{ t('dashboard.remaining') }}</p>
      <p class="mt-1 text-2xl font-semibold tabular-nums" :class="remainingClass">
        {{ formatEur(plan.remainingCents) }}
      </p>
      <p v-if="plan.fixedReservedCents" class="text-muted mt-1 text-sm">
        {{ t('dashboard.flexibleLeft') }}:
        <span class="text-foreground tabular-nums">{{ formatEur(plan.flexibleLeftCents) }}</span>
      </p>
      <p v-if="isCurrentMonth" class="text-muted mt-2 text-sm">
        <template v-if="plan.limitCents === 0">
          {{ t('dashboard.noLimitHint') }}
        </template>
        <template v-else-if="plan.flexibleLeftCents < 0">
          <span class="text-danger">
            {{
              t('dashboard.variableOver', { amount: formatEur(Math.abs(plan.flexibleLeftCents)) })
            }}
          </span>
        </template>
        <template v-else>
          {{ t('dashboard.dailyAllowance') }}:
          <span class="text-foreground tabular-nums">{{ formatEur(dailyCents) }}</span>
        </template>
      </p>
    </article>
  </section>
</template>
