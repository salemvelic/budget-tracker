<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import type { Txn } from '@/db'
import { formatEur } from '@/domain/money'
import { formatIsoDate } from '@/domain/month'

defineProps<{
  txns: Pick<Txn, 'id' | 'date' | 'amountCents' | 'merchant' | 'source' | 'note'>[]
  variant?: 'leaf' | 'indented'
}>()

const { t, locale } = useI18n()
</script>

<template>
  <ul
    class="mt-1 space-y-1 border-l border-border text-xs"
    :class="variant === 'leaf' ? 'pl-6' : 'pl-4 text-muted'"
  >
    <li v-if="!txns.length" class="text-muted">{{ t('dashboard.noExpenses') }}</li>
    <li v-for="txn in txns" :key="txn.id" class="flex justify-between gap-3 py-0.5">
      <span class="min-w-0 break-words" :class="variant === 'leaf' ? 'text-muted' : ''">
        {{ formatIsoDate(txn.date, locale) }} · {{ txn.merchant }}
        <span v-if="txn.note"> · {{ txn.note }}</span>
        · {{ t(`transactions.sources.${txn.source}`) }}
      </span>
      <span class="shrink-0 tabular-nums" :class="variant === 'leaf' ? '' : 'text-foreground'">
        {{ formatEur(txn.amountCents) }}
      </span>
    </li>
  </ul>
</template>
