<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useCollapsed } from '@/composables/useCollapsed'
import type { Category, Txn } from '@/db'
import { recurringPayments, recurringTotalCents } from '@/domain/recurring'
import { formatEur } from '@/domain/money'

const props = defineProps<{
  txns: Pick<Txn, 'date' | 'amountCents' | 'merchant' | 'note' | 'category'>[]
  categories: Category[]
  selectedMonth: string
}>()

const { t } = useI18n()
const { collapsed, toggle } = useCollapsed('recurring')

const list = computed(() => recurringPayments(props.txns, props.selectedMonth, props.categories))
const total = computed(() => recurringTotalCents(list.value))
</script>

<template>
  <article v-if="list.length" class="border-border bg-surface-muted rounded-xl border p-4">
    <button
      type="button"
      class="hover:bg-surface flex w-full items-center gap-1 rounded-lg px-1 py-0.5 text-left text-sm"
      :aria-expanded="!collapsed"
      @click="toggle"
    >
      <span
        class="text-muted inline-block w-4 shrink-0 transition-transform"
        :class="!collapsed ? 'rotate-90' : ''"
        aria-hidden="true"
      >
        ›
      </span>
      <span class="text-muted flex-1">{{ t('dashboard.recurringHeading') }}</span>
      <span class="text-foreground tabular-nums">
        {{ t('dashboard.recurringTotal', { amount: formatEur(total) }) }}
      </span>
    </button>
    <ul v-if="!collapsed" class="mt-3 space-y-2 text-sm">
      <li
        v-for="item in list"
        :key="item.merchant"
        class="flex flex-wrap items-center justify-between gap-2"
      >
        <span class="min-w-0 break-words">{{ item.merchant }}</span>
        <span class="text-muted shrink-0 tabular-nums">
          <template v-if="item.paid">
            {{ t('dashboard.recurringPaid', { amount: formatEur(item.paidThisMonthCents) }) }}
          </template>
          <template v-else>
            {{ t('dashboard.recurringPending', { amount: formatEur(item.typicalCents) }) }}
          </template>
        </span>
      </li>
    </ul>
  </article>
</template>
