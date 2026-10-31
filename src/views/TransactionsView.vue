<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MonthPicker from '@/components/MonthPicker.vue'
import TransactionForm from '@/components/TransactionForm.vue'
import TransactionList from '@/components/TransactionList.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Txn } from '@/db'
import { deleteTxn, recategorizeTxn } from '@/db/txns'
import { monthKey, monthRange } from '@/domain/month'
import type { TxnInput } from '@/domain/transactions'

const { t } = useI18n()
const selectedMonth = ref(monthKey())
const editing = ref<Txn | null>(null)
const remember = ref(true)
const ruleMessage = ref('')

const categories = useLiveQuery(() => db.categories.toArray(), [])

const txns = useLiveQuery(
  async () => {
    const { start, end } = monthRange(selectedMonth.value)
    return db.txns.where('date').between(start, end, true, true).sortBy('date')
  },
  [],
  selectedMonth,
)

const sortedTxns = computed(() =>
  [...txns.value].sort((a, b) => b.date.localeCompare(a.date) || (b.id ?? 0) - (a.id ?? 0)),
)

async function saveTxn(input: TxnInput) {
  if (editing.value?.id != null) {
    await db.txns.update(editing.value.id, input)
    editing.value = null
    return
  }
  await db.txns.add(input)
}

async function removeTxn(id: number) {
  await deleteTxn(id)
  if (editing.value?.id === id) {
    editing.value = null
  }
}

async function changeCategory(txn: Txn, category: string) {
  const moved = await recategorizeTxn(txn, category, remember.value)
  ruleMessage.value = remember.value
    ? t('transactions.ruleSaved', { merchant: txn.merchant, count: moved })
    : ''
}
</script>

<template>
  <div class="space-y-6">
    <MonthPicker v-model="selectedMonth" />

    <section class="space-y-3">
      <h2 class="text-lg font-semibold">
        {{ editing ? t('transactions.editHeading') : t('transactions.addHeading') }}
      </h2>
      <TransactionForm
        :categories="categories"
        :initial="editing"
        @save="saveTxn"
        @cancel="editing = null"
      />
    </section>

    <section class="space-y-3">
      <label class="flex items-center gap-2 text-sm">
        <input v-model="remember" type="checkbox" />
        {{ t('transactions.rememberRule') }}
      </label>
      <p v-if="ruleMessage" class="text-success text-sm">{{ ruleMessage }}</p>
      <TransactionList
        :txns="sortedTxns"
        :categories="categories"
        @edit="editing = $event"
        @remove="removeTxn"
        @recategorize="changeCategory"
      />
    </section>
  </div>
</template>
