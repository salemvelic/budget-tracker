<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ImportPreview from '@/components/ImportPreview.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { filterNewImportRows, importParsedRows } from '@/db/importRows'
import { db, type CategoryRule } from '@/db'
import { categorizeDescription, DEFAULT_CATEGORY_RULES } from '@/domain/categorize'
import { parseRevolutCsv, type RevolutParseSkipped } from '@/domain/importers/revolut'
import type { ParsedImportRow } from '@/domain/importers/types'

type ImportSource = 'revolut' | 'ersteCardClub'

const { t, te } = useI18n()

const fileInput = ref<HTMLInputElement | null>(null)
const source = ref<ImportSource>('revolut')
const errorCode = ref('')
const fileName = ref('')
const preview = ref<ParsedImportRow[]>([])
const skipped = ref<RevolutParseSkipped | null>(null)
const importedCount = ref<number | null>(null)
const allAlreadyImported = ref(false)
const importing = ref(false)
const parsedTotal = ref(0)

const rules = useLiveQuery(() => db.rules.toArray(), [] as CategoryRule[])

function categorize(description: string) {
  const dbRules = rules.value.map((rule) => ({ pattern: rule.pattern, category: rule.category }))
  return categorizeDescription(description, [...dbRules, ...DEFAULT_CATEGORY_RULES])
}

function errorMessage(code: string): string {
  const key = `import.errors.${code}`
  return te(key) ? t(key) : t('import.errors.invalid')
}

function resetFileInput() {
  if (fileInput.value) fileInput.value.value = ''
}

async function onFileChange(event: Event) {
  errorCode.value = ''
  importedCount.value = null
  allAlreadyImported.value = false
  preview.value = []
  skipped.value = null
  parsedTotal.value = 0

  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name

  try {
    if (source.value === 'revolut') {
      const text = await file.text()
      const result = parseRevolutCsv(text, categorize)
      skipped.value = result.skipped
      parsedTotal.value = result.rows.length
      preview.value = await filterNewImportRows(result.rows)
      if (result.rows.length > 0 && preview.value.length === 0) {
        allAlreadyImported.value = true
      }
      if (result.rows.length === 0) {
        errorCode.value = 'empty'
      }
    } else {
      errorCode.value = 'pdf.pending'
    }
  } catch (e) {
    errorCode.value = e instanceof Error ? e.message : 'invalid'
  }
}

async function runImport() {
  if (preview.value.length === 0) return
  importing.value = true
  errorCode.value = ''
  try {
    importedCount.value = await importParsedRows(preview.value)
    preview.value = []
    skipped.value = null
    resetFileInput()
  } catch {
    errorCode.value = 'import.failed'
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-border bg-surface-muted p-6">
      <fieldset class="space-y-3">
        <legend class="text-sm font-medium">{{ t('import.sourceLegend') }}</legend>
        <label class="mr-4 inline-flex items-center gap-2 text-sm">
          <input v-model="source" type="radio" value="revolut" />
          {{ t('import.sources.revolut') }}
        </label>
        <label class="inline-flex items-center gap-2 text-sm">
          <input v-model="source" type="radio" value="ersteCardClub" />
          {{ t('import.sources.ersteCardClub') }}
        </label>
      </fieldset>

      <p class="mb-4 mt-4 text-sm text-muted">
        {{
          source === 'revolut' ? t('import.revolut.help') : t('import.ersteCardClub.help')
        }}
      </p>
      <label class="block text-sm font-medium">
        {{ t('import.fileLabel') }}
        <input
          ref="fileInput"
          type="file"
          :accept="source === 'revolut' ? '.csv,text/csv' : '.pdf,application/pdf'"
          class="mt-2 block w-full text-sm"
          @change="onFileChange"
        />
      </label>
      <p v-if="fileName" class="mt-2 text-sm text-muted">{{ fileName }}</p>
      <p v-if="errorCode" class="mt-2 text-sm text-danger">{{ errorMessage(errorCode) }}</p>
      <p v-if="allAlreadyImported" class="mt-2 text-sm text-muted">{{ t('import.allAlreadyImported') }}</p>
    </section>

    <ImportPreview
      :preview="preview"
      :skipped="skipped"
      :importing="importing"
      @import="runImport"
    />

    <p v-if="importedCount != null" class="text-sm text-success">
      {{ t('import.revolut.done', { count: importedCount }) }}
    </p>
  </div>
</template>
