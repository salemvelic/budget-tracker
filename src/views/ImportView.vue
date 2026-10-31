<script setup lang="ts">
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { categorizeDescription, DEFAULT_CATEGORY_RULES } from '@/domain/categorize'
import { formatEur } from '@/domain/money'
import { importParsedRows, filterNewImportRows } from '@/domain/importRows'
import { db, type CategoryRule } from '@/db'
import { parseRevolutCsv, type ParsedImportRow } from '@/domain/importers/revolut'
import { useLiveQuery } from '@/composables/useLiveQuery'

const { t } = useI18n()

const error = ref('')
const fileName = ref('')
const preview = ref<ParsedImportRow[]>([])
const importedCount = ref<number | null>(null)

const rules = useLiveQuery(() => db.rules.toArray(), [] as CategoryRule[])

const newCount = computed(() => preview.value.length)

function categorize(description: string) {
  const dbRules = rules.value.map((rule) => ({ pattern: rule.pattern, category: rule.category }))
  return categorizeDescription(description, [...dbRules, ...DEFAULT_CATEGORY_RULES])
}

async function onFileChange(event: Event) {
  error.value = ''
  importedCount.value = null
  preview.value = []
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  try {
    const text = await file.text()
    const parsed = parseRevolutCsv(text, categorize)
    preview.value = await filterNewImportRows(parsed)
  } catch {
    error.value = t('import.errors.invalid')
  }
}

async function runImport() {
  error.value = ''
  importedCount.value = await importParsedRows(preview.value)
  preview.value = []
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-border bg-surface-muted p-6">
      <p class="mb-4 text-sm text-muted">{{ t('import.revolut.help') }}</p>
      <label class="block text-sm font-medium">
        {{ t('import.revolut.fileLabel') }}
        <input
          type="file"
          accept=".csv,text/csv"
          class="mt-2 block w-full text-sm"
          @change="onFileChange"
        />
      </label>
      <p v-if="fileName" class="mt-2 text-sm text-muted">{{ fileName }}</p>
      <p v-if="error" class="mt-2 text-sm text-danger">{{ error }}</p>
    </section>

    <section v-if="preview.length" class="space-y-3 rounded-xl border border-border bg-surface-muted p-6">
      <p class="text-sm">
        {{ t('import.revolut.previewCount', { count: newCount }) }}
      </p>
      <ul class="divide-y divide-border rounded-lg border border-border bg-surface">
        <li
          v-for="row in preview.slice(0, 10)"
          :key="row.importHash"
          class="flex justify-between gap-3 px-3 py-2 text-sm"
        >
          <span>{{ row.date }} · {{ row.merchant }}</span>
          <span class="tabular-nums font-medium">{{ formatEur(row.amountCents) }}</span>
        </li>
      </ul>
      <p v-if="preview.length > 10" class="text-xs text-muted">
        {{ t('import.revolut.moreRows', { count: preview.length - 10 }) }}
      </p>
      <button
        type="button"
        class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground"
        @click="runImport"
      >
        {{ t('import.revolut.importButton') }}
      </button>
    </section>

    <p v-if="importedCount != null" class="text-sm text-success">
      {{ t('import.revolut.done', { count: importedCount }) }}
    </p>
  </div>
</template>
