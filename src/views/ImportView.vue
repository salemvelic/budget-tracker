<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ImportPreview from '@/components/ImportPreview.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { filterNewImportRows, importParsedRows } from '@/db/importRows'
import { db, type CategoryRule } from '@/db'
import { categorizeDescription, DEFAULT_CATEGORY_RULES } from '@/domain/categorize'
import { parsePdfStatement, type PdfStatementKind } from '@/domain/importers/pdfStatement'
import type { ImportParseResult, ImportSkipped, ParsedImportRow } from '@/domain/importers/types'

const { t, te } = useI18n()

const errorCode = ref('')
const fileName = ref('')
const detected = ref<PdfStatementKind | null>(null)
const preview = ref<ParsedImportRow[]>([])
const skipped = ref<ImportSkipped>({})
const importedCount = ref<number | null>(null)
const allAlreadyImported = ref(false)
const busy = ref(false)

const rules = useLiveQuery(() => db.rules.toArray(), [] as CategoryRule[])

function categorize(description: string) {
  const userRules = rules.value.map((rule) => ({ pattern: rule.pattern, category: rule.category }))
  return categorizeDescription(description, [...userRules, ...DEFAULT_CATEGORY_RULES])
}

function errorMessage(code: string): string {
  const key = `import.errors.${code}`
  return te(key) ? t(key) : t('import.errors.invalid')
}

function reset() {
  errorCode.value = ''
  detected.value = null
  preview.value = []
  skipped.value = {}
  importedCount.value = null
  allAlreadyImported.value = false
}

async function parseFile(file: File): Promise<ImportParseResult> {
  const { extractPdfLines } = await import('@/services/pdfText')
  const result = parsePdfStatement(await extractPdfLines(file), categorize)
  detected.value = result.kind
  return result
}

async function onFileChange(event: Event) {
  reset()
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  fileName.value = file.name
  busy.value = true
  try {
    const result = await parseFile(file)
    skipped.value = result.skipped
    preview.value = await filterNewImportRows(result.rows)
    if (result.rows.length === 0) errorCode.value = 'empty'
    else if (preview.value.length === 0) allAlreadyImported.value = true
  } catch (e) {
    errorCode.value = e instanceof Error ? e.message : 'invalid'
  } finally {
    busy.value = false
    input.value = ''
  }
}

async function runImport() {
  if (preview.value.length === 0) return
  busy.value = true
  errorCode.value = ''
  try {
    importedCount.value = await importParsedRows(preview.value)
    preview.value = []
    skipped.value = {}
  } catch {
    errorCode.value = 'import.failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="rounded-xl border border-border bg-surface-muted p-6">
      <p class="mb-4 text-sm text-muted">{{ t('import.help') }}</p>
      <label class="block text-sm font-medium">
        {{ t('import.fileLabel') }}
        <input
          type="file"
          accept=".pdf,application/pdf"
          :disabled="busy"
          class="mt-2 block w-full text-sm"
          @change="onFileChange"
        />
      </label>
      <p v-if="fileName" class="mt-2 text-sm text-muted">
        {{ fileName }}
        <span v-if="detected"> · {{ t(`import.detected.${detected}`) }}</span>
      </p>
      <p v-if="busy" class="mt-2 text-sm text-muted">{{ t('import.reading') }}</p>
      <p v-if="errorCode" class="mt-2 text-sm text-danger">{{ errorMessage(errorCode) }}</p>
      <p v-if="allAlreadyImported" class="mt-2 text-sm text-muted">{{ t('import.allAlreadyImported') }}</p>
    </section>

    <ImportPreview :preview="preview" :skipped="skipped" :importing="busy" @import="runImport" />

    <p v-if="importedCount != null" class="text-sm text-success">
      {{ t('import.done', { count: importedCount }) }}
    </p>
  </div>
</template>
