<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import DashboardExpenseList from '@/components/dashboard/DashboardExpenseList.vue'
import { useCollapsed } from '@/composables/useCollapsed'
import type { Category, Txn } from '@/db'
import { formatEur } from '@/domain/money'
import { spendingAboveAverage, type CategoryTrend } from '@/domain/trends'
import { txnsInCategory } from '@/domain/transactions'

export interface CategoryBreakdownRow {
  id: string
  cents: number
  children: [string, number][]
}

const props = defineProps<{
  rows: CategoryBreakdownRow[]
  trends: Record<string, CategoryTrend>
  categories: Category[]
  txns: Txn[]
  expandedId: string | null
  openListId: string | null
}>()

const emit = defineEmits<{
  categoryClick: [row: CategoryBreakdownRow]
  subcategoryClick: [categoryId: string]
}>()

const { t } = useI18n()
const { collapsed, toggle } = useCollapsed('byCategory')

function nameOf(id: string) {
  const category = props.categories.find((item) => item.id === id)
  return category ? t(category.nameKey) : id
}

function categoryHasSubrows(row: CategoryBreakdownRow) {
  return row.children.length > 0
}

const openListTxns = computed(() =>
  props.openListId ? txnsInCategory(props.txns, props.openListId) : [],
)

function expensesFor(categoryId: string) {
  return txnsInCategory(props.txns, categoryId)
}

function trendClass(row: CategoryBreakdownRow) {
  const trend = props.trends[row.id]
  if (!trend) return 'text-muted'
  return spendingAboveAverage(row.cents, trend.avg3Cents) ? 'text-warning' : 'text-muted'
}
</script>

<template>
  <section class="border-border bg-surface-muted rounded-xl border p-4">
    <h2 class="font-medium">
      <button
        type="button"
        class="hover:bg-surface flex w-full items-center gap-1 rounded-lg px-1 py-0.5 text-left"
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
        {{ t('dashboard.byCategory') }}
      </button>
    </h2>
    <template v-if="!collapsed">
      <ul v-if="rows.length" class="mt-3 space-y-2">
        <li v-for="row in rows" :key="row.id" class="text-sm">
          <button
            type="button"
            class="hover:bg-surface flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left"
            :aria-expanded="categoryHasSubrows(row) ? expandedId === row.id : openListId === row.id"
            @click="emit('categoryClick', row)"
          >
            <span class="flex min-w-0 flex-col gap-0.5">
              <span class="flex min-w-0 items-center gap-1">
                <span
                  v-if="categoryHasSubrows(row)"
                  class="text-muted inline-block w-4 shrink-0 transition-transform"
                  :class="expandedId === row.id ? 'rotate-90' : ''"
                  aria-hidden="true"
                >
                  ›
                </span>
                <span v-else class="inline-block w-4 shrink-0" aria-hidden="true" />
                <span>{{ nameOf(row.id) }}</span>
              </span>
              <span v-if="trends[row.id]" class="pl-5 text-xs" :class="trendClass(row)">
                {{
                  t('dashboard.trendLine', {
                    last: formatEur(trends[row.id]!.lastMonthCents),
                    avg: formatEur(trends[row.id]!.avg3Cents),
                  })
                }}
              </span>
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
                class="text-muted hover:bg-surface flex w-full items-center justify-between gap-2 rounded-lg px-1 py-0.5 text-left"
                :aria-expanded="openListId === childId"
                @click="emit('subcategoryClick', childId)"
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
      <p v-else class="text-muted mt-3 text-sm">{{ t('dashboard.noSpend') }}</p>
    </template>
  </section>
</template>
