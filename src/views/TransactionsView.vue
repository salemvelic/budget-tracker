<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import MonthPicker from '@/components/MonthPicker.vue'
import CategorySelect from '@/components/CategorySelect.vue'
import TransactionForm from '@/components/TransactionForm.vue'
import TransactionList from '@/components/TransactionList.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Txn } from '@/db'
import { deleteTxn, recategorizeTxn, saveRuleAndApply } from '@/db/txns'
import { suggestedRulePattern, validateRulePattern } from '@/domain/categorize'
import { monthKey, monthRange } from '@/domain/month'
import type { TxnInput } from '@/domain/transactions'

const { t } = useI18n()
const selectedMonth = ref(monthKey())
const editing = ref<Txn | null>(null)
const remember = ref(true)
const ruleMessage = ref('')

const pendingRule = ref<{ merchant: string; category: string } | null>(null)
const rulePattern = ref('')
const ruleAttempted = ref(false)

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

const ruleError = computed(() => {
  if (!ruleAttempted.value) return ''
  const code = validateRulePattern(rulePattern.value)
  return code ? t(`settings.rules.errors.${code}`) : ''
})

async function saveTxn(input: TxnInput) {
  const payload = { ...input, categoryLocked: true as const }
  if (editing.value?.id != null) {
    await db.txns.update(editing.value.id, payload)
    editing.value = null
    return
  }
  await db.txns.add(payload)
}

async function removeTxn(id: number) {
  await deleteTxn(id)
  if (editing.value?.id === id) {
    editing.value = null
  }
}

async function changeCategory(txn: Txn, category: string) {
  ruleMessage.value = ''
  pendingRule.value = null
  await recategorizeTxn(txn, category)
  if (remember.value) {
    pendingRule.value = { merchant: txn.merchant, category }
    rulePattern.value = suggestedRulePattern(txn.merchant)
    ruleAttempted.value = false
  }
}

async function confirmRule() {
  if (!pendingRule.value) return
  ruleAttempted.value = true
  if (validateRulePattern(rulePattern.value)) return
  try {
    const count = await saveRuleAndApply(rulePattern.value, pendingRule.value.category)
    ruleMessage.value = t('transactions.ruleSaved', {
      merchant: pendingRule.value.merchant,
      count,
    })
    pendingRule.value = null
  } catch {
    ruleMessage.value = ''
  }
}

function cancelRule() {
  pendingRule.value = null
  ruleAttempted.value = false
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
      <div
        v-if="pendingRule"
        class="border-border bg-surface-muted space-y-3 rounded-xl border p-4 text-sm"
      >
        <p>{{ t('transactions.ruleSuggestHeading', { merchant: pendingRule.merchant }) }}</p>
        <div class="flex flex-wrap items-end gap-3">
          <label class="block min-w-[12rem] flex-1 space-y-1">
            <span class="text-muted">{{ t('settings.rules.pattern') }}</span>
            <input
              v-model="rulePattern"
              type="text"
              class="border-border bg-surface w-full rounded-lg border px-3 py-2"
            />
          </label>
          <CategorySelect
            v-model="pendingRule.category"
            :categories="categories"
            class="border-border bg-surface rounded-lg border px-3 py-2"
          />
          <button
            type="button"
            class="bg-brand text-brand-foreground rounded-lg px-4 py-2 font-medium"
            @click="confirmRule"
          >
            {{ t('transactions.saveRule') }}
          </button>
          <button type="button" class="border-border rounded-lg border px-4 py-2" @click="cancelRule">
            {{ t('common.cancel') }}
          </button>
        </div>
        <p v-if="ruleError" class="text-danger">{{ ruleError }}</p>
      </div>
      <p v-else-if="ruleMessage" class="text-success text-sm">{{ ruleMessage }}</p>
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
