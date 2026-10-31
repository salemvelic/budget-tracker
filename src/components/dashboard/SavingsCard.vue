<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import DashboardExpenseList from '@/components/dashboard/DashboardExpenseList.vue'
import { formatEur } from '@/domain/money'
import type { MonthPlan } from '@/domain/plan'
import type { Txn } from '@/db'

defineProps<{
  plan: MonthPlan
  savingsGroups: { merchant: string; cents: number; txns: Txn[] }[]
  savingsOpen: boolean
  openSavingsMerchant: string | null
  isOpenSavingsGroup: (merchant: string) => boolean
}>()

const emit = defineEmits<{
  savingsClick: []
  savingsGroupClick: [merchant: string]
}>()

const { t } = useI18n()
</script>

<template>
  <article class="border-border bg-surface-muted rounded-xl border p-4">
    <component
      :is="savingsGroups.length ? 'button' : 'div'"
      :type="savingsGroups.length ? 'button' : undefined"
      class="w-full text-left"
      :class="savingsGroups.length ? 'hover:bg-surface rounded-lg' : ''"
      :aria-expanded="savingsGroups.length ? savingsOpen : undefined"
      @click="savingsGroups.length ? emit('savingsClick') : undefined"
    >
      <p class="text-muted text-sm">{{ t('dashboard.savedThisMonth') }}</p>
      <div class="mt-1 flex items-center justify-between gap-2">
        <span class="flex min-w-0 items-center gap-1">
          <span
            v-if="savingsGroups.length"
            class="text-muted inline-block w-4 shrink-0 transition-transform"
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
          class="text-muted hover:bg-surface flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left"
          :aria-expanded="isOpenSavingsGroup(group.merchant)"
          @click="emit('savingsGroupClick', group.merchant)"
        >
          <span class="min-w-0 break-words">{{ group.merchant }}</span>
          <span class="shrink-0 tabular-nums">{{ formatEur(group.cents) }}</span>
        </button>
        <DashboardExpenseList
          v-if="isOpenSavingsGroup(group.merchant)"
          :txns="group.txns"
          variant="indented"
        />
      </li>
    </ul>
  </article>
</template>
