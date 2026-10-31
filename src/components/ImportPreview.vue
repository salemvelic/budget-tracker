<script setup lang="ts">
import { useI18n } from 'vue-i18n'

import { useLiveQuery } from '@/composables/useLiveQuery'
import { db, type Category } from '@/db'
import { formatEur } from '@/domain/money'
import type { RevolutParseSkipped } from '@/domain/importers/revolut'
import type { ParsedImportRow } from '@/domain/importers/types'

defineProps<{
  preview: ParsedImportRow[]
  skipped: RevolutParseSkipped | null
  importing: boolean
}>()

const emit = defineEmits<{
  import: []
}>()

const { t } = useI18n()

const rules = useLiveQuery(() => db.categories.toArray(), [] as Category[])

function categoryLabel(id: string) {
  const category = rules.value.find((c) => c.id === id)
  return category ? t(category.nameKey) : id
}
</script>

<template>
  <section v-if="preview.length" class="space-y-3 rounded-xl border border-border bg-surface-muted p-6">
    <p class="text-sm">
      {{ t('import.revolut.previewCount', { count: preview.length }) }}
    </p>
    <ul class="divide-y divide-border rounded-lg border border-border bg-surface">
      <li
        v-for="row in preview.slice(0, 10)"
        :key="row.importHash"
        class="flex flex-col gap-1 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between"
      >
        <span>{{ row.date }} · {{ row.merchant }} · {{ categoryLabel(row.category) }}</span>
        <span class="tabular-nums font-medium">{{ formatEur(row.amountCents) }}</span>
      </li>
    </ul>
    <p v-if="preview.length > 10" class="text-xs text-muted">
      {{ t('import.revolut.moreRows', { count: preview.length - 10 }) }}
    </p>
    <p v-if="skipped" class="text-xs text-muted">
      {{
        t('import.revolut.skipped', {
          pending: skipped.notCompleted,
          other: skipped.otherType,
          fx: skipped.foreignCurrency,
        })
      }}
    </p>
    <button
      type="button"
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      :disabled="importing"
      @click="emit('import')"
    >
      {{ t('import.revolut.importButton') }}
    </button>
  </section>
</template>
