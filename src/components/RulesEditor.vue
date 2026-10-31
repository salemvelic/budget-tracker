<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import CategorySelect from '@/components/CategorySelect.vue'
import { useCategoryLabel } from '@/composables/useCategoryLabel'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category, type CategoryRule } from '@/db'
import { DEFAULT_CATEGORY_RULES, recategorizeOther, validateRulePattern } from '@/domain/categorize'

const { t } = useI18n()

const rules = useLiveQuery(() => db.rules.toArray(), [] as CategoryRule[])
const categories = useLiveQuery(() => db.categories.toArray(), [] as Category[])

const form = reactive({ pattern: '', category: 'food' })
const attempted = ref(false)
const applied = ref<number | null>(null)

const errorCode = computed(() => validateRulePattern(form.pattern))
const visibleError = computed(() =>
  attempted.value && errorCode.value ? t(`settings.rules.errors.${errorCode.value}`) : '',
)

const categoryLabel = useCategoryLabel(categories)

async function addRule() {
  attempted.value = true
  if (errorCode.value) return
  await db.rules.add({ pattern: form.pattern.trim(), category: form.category })
  form.pattern = ''
  attempted.value = false
}

async function removeRule(id: number | undefined) {
  if (id != null) await db.rules.delete(id)
}

async function applyToOther() {
  const userRules = rules.value.map(({ pattern, category }) => ({ pattern, category }))
  const txns = await db.txns.where('category').equals('other').toArray()
  const changes = recategorizeOther(txns, [...userRules, ...DEFAULT_CATEGORY_RULES])
  await db.transaction('rw', db.txns, async () => {
    for (const change of changes) await db.txns.update(change.id, { category: change.category })
  })
  applied.value = changes.length
}
</script>

<template>
  <section class="border-border bg-surface-muted space-y-4 rounded-xl border p-6">
    <div>
      <h2 class="font-semibold">{{ t('settings.rules.heading') }}</h2>
      <p class="text-muted mt-1 text-sm">{{ t('settings.rules.help') }}</p>
    </div>

    <ul
      v-if="rules.length"
      class="divide-border border-border bg-surface divide-y rounded-lg border"
    >
      <li
        v-for="rule in rules"
        :key="rule.id"
        class="flex items-center justify-between gap-3 px-3 py-2 text-sm"
      >
        <span>
          <code class="bg-surface-muted rounded px-1">{{ rule.pattern }}</code>
          → {{ categoryLabel(rule.category) }}
        </span>
        <button type="button" class="text-danger" @click="removeRule(rule.id)">
          {{ t('common.delete') }}
        </button>
      </li>
    </ul>
    <p v-else class="text-muted text-sm">{{ t('settings.rules.empty') }}</p>

    <form class="grid gap-3 sm:grid-cols-[1fr_auto_auto]" @submit.prevent="addRule">
      <input
        v-model="form.pattern"
        type="text"
        :placeholder="t('settings.rules.patternPlaceholder')"
        :aria-label="t('settings.rules.pattern')"
        class="border-border bg-surface rounded-lg border px-3 py-2 text-sm"
      />
      <CategorySelect
        v-model="form.category"
        :categories="categories"
        :aria-label="t('transactions.form.category')"
        class="border-border bg-surface rounded-lg border px-3 py-2 text-sm"
      />
      <button
        type="submit"
        class="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium"
      >
        {{ t('settings.rules.add') }}
      </button>
    </form>
    <p v-if="visibleError" class="text-danger text-sm">{{ visibleError }}</p>

    <div class="flex flex-wrap items-center gap-3">
      <button
        type="button"
        class="border-border rounded-lg border px-4 py-2 text-sm font-medium"
        @click="applyToOther"
      >
        {{ t('settings.rules.applyToOther') }}
      </button>
      <p v-if="applied != null" class="text-success text-sm">
        {{ t('settings.rules.applied', { count: applied }) }}
      </p>
    </div>
  </section>
</template>
