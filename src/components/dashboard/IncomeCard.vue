<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCollapsed } from '@/composables/useCollapsed'
import { formatEur } from '@/domain/money'
import type { MonthPlan } from '@/domain/plan'

const props = defineProps<{
  plan: MonthPlan
}>()

const { t } = useI18n()
const { collapsed, toggle } = useCollapsed('income')

const netCents = computed(
  () => props.plan.incomeCents - props.plan.spentCents - props.plan.savedCents,
)

const savingsRateLabel = computed(() => {
  if (props.plan.savingsRate == null) return ''
  return `${Math.round(props.plan.savingsRate * 100)} %`
})
</script>

<template>
  <article class="border-border bg-surface-muted rounded-xl border p-4">
    <button
      type="button"
      class="text-muted hover:bg-surface flex w-full items-center gap-1 rounded-lg px-1 py-0.5 text-left text-sm"
      :aria-expanded="!collapsed"
      @click="toggle"
    >
      <span
        class="inline-block w-4 shrink-0 transition-transform"
        :class="!collapsed ? 'rotate-90' : ''"
        aria-hidden="true"
      >
        ›
      </span>
      {{ t('dashboard.incomeHeading') }}
    </button>
    <template v-if="!collapsed">
      <dl class="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div class="flex justify-between gap-2 sm:block">
          <dt class="text-muted">{{ t('dashboard.incomeTotal') }}</dt>
          <dd class="font-medium tabular-nums">{{ formatEur(plan.incomeCents) }}</dd>
        </div>
        <div class="flex justify-between gap-2 sm:block">
          <dt class="text-muted">{{ t('dashboard.incomeSpent') }}</dt>
          <dd class="tabular-nums">{{ formatEur(plan.spentCents) }}</dd>
        </div>
        <div class="flex justify-between gap-2 sm:block">
          <dt class="text-muted">{{ t('dashboard.incomeSaved') }}</dt>
          <dd class="tabular-nums">{{ formatEur(plan.savedCents) }}</dd>
        </div>
        <div v-if="plan.savingsRate != null" class="flex justify-between gap-2 sm:block">
          <dt class="text-muted">{{ t('dashboard.incomeSavingsRate') }}</dt>
          <dd class="tabular-nums">{{ savingsRateLabel }}</dd>
        </div>
      </dl>
      <p class="text-muted mt-3 text-sm">
        {{ t('dashboard.incomeNet') }}:
        <span class="text-foreground tabular-nums">{{ formatEur(netCents) }}</span>
      </p>
    </template>
  </article>
</template>
