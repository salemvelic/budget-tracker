<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category } from '@/db'
import { formatEur } from '@/domain/money'
import { formatIsoDate } from '@/domain/month'
import type { ImportSkipped, ParsedImportRow, SkipReason } from '@/domain/importers/types'

const props = defineProps<{
  preview: ParsedImportRow[]
  skipped: ImportSkipped
  importing: boolean
}>()

const emit = defineEmits<{
  import: []
  setCategory: [index: number, category: string]
}>()

const { t, locale } = useI18n()

const categories = useLiveQuery(() => db.categories.toArray(), [] as Category[])

const skippedEntries = computed(() =>
  (Object.entries(props.skipped) as [SkipReason, number][]).filter(([, count]) => count > 0),
)

function onCategoryChange(index: number, event: Event) {
  emit('setCategory', index, (event.target as HTMLSelectElement).value)
}
</script>

<template>
  <section v-if="preview.length" class="space-y-3 rounded-xl border border-border bg-surface-muted p-6">
    <p class="text-sm">
      {{ t('import.previewCount', { count: preview.length }) }}
      <span class="text-muted">{{ t('import.previewHelp') }}</span>
    </p>
    <ul class="max-h-[28rem] divide-y divide-border overflow-y-auto rounded-lg border border-border bg-surface">
      <li
        v-for="(row, index) in preview"
        :key="row.importHash"
        class="flex flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <span class="min-w-0 break-words">
          <span class="text-muted tabular-nums">{{ formatIsoDate(row.date, locale) }}</span>
          · {{ row.merchant }}
          <span v-if="row.note" class="text-muted">({{ row.note }})</span>
        </span>
        <span class="flex shrink-0 items-center gap-2">
          <select
            :value="row.category"
            :aria-label="t('transactions.categoryFor', { merchant: row.merchant })"
            class="rounded-lg border border-border bg-surface-muted px-2 py-1 text-sm"
            @change="onCategoryChange(index, $event)"
          >
            <option v-for="category in categories" :key="category.id" :value="category.id">
              {{ t(category.nameKey) }}
            </option>
          </select>
          <span class="w-24 text-right font-medium tabular-nums">{{ formatEur(row.amountCents) }}</span>
        </span>
      </li>
    </ul>
    <button
      type="button"
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      :disabled="importing"
      @click="emit('import')"
    >
      {{ t('import.importButton') }}
    </button>
  </section>

  <section v-if="skippedEntries.length" class="rounded-xl border border-border p-4 text-xs text-muted">
    <p class="mb-1 font-medium">{{ t('import.skippedHeading') }}</p>
    <ul class="space-y-0.5">
      <li v-for="[reason, count] in skippedEntries" :key="reason">
        {{ t(`import.skipReasons.${reason}`) }}: <span class="tabular-nums">{{ count }}</span>
      </li>
    </ul>
  </section>
</template>
