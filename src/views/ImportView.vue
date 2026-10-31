<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

import ImportPreview from '@/components/ImportPreview.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { filterNewImportRows, importParsedRows } from '@/db/importRows'
import { db, type CategoryRule } from '@/db'
import { categorizeDescription, DEFAULT_CATEGORY_RULES } from '@/domain/categorize'
import { parsePdfStatement, type PdfStatementKind } from '@/domain/importers/pdfStatement'
import { mergeSkipped, type ImportSkipped, type ParsedImportRow } from '@/domain/importers/types'

interface FileResult {
  name: string
  kind?: PdfStatementKind
  errorCode?: string
}

const { t, te } = useI18n()

const errorCode = ref('')
const files = ref<FileResult[]>([])
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
  files.value = []
  preview.value = []
  skipped.value = {}
  importedCount.value = null
  allAlreadyImported.value = false
}

async function onFileChange(event: Event) {
  reset()
  const input = event.target as HTMLInputElement
  const selected = [...(input.files ?? [])]
  if (selected.length === 0) return

  busy.value = true
  try {
    const { extractPdfLines } = await import('@/services/pdfText')
    const rows: ParsedImportRow[] = []
    const skips: ImportSkipped[] = []
    for (const file of selected) {
      try {
        const result = parsePdfStatement(await extractPdfLines(file), categorize)
        rows.push(...result.rows)
        skips.push(result.skipped)
        files.value.push(
          result.rows.length === 0 ? { name: file.name, errorCode: 'empty' } : { name: file.name, kind: result.kind },
        )
      } catch (e) {
        files.value.push({ name: file.name, errorCode: e instanceof Error ? e.message : 'invalid' })
      }
    }
    skipped.value = mergeSkipped(...skips)
    const fresh = await filterNewImportRows(rows)
    preview.value = fresh.sort((a, b) => a.date.localeCompare(b.date))
    if (rows.length > 0 && preview.value.length === 0) allAlreadyImported.value = true
  } catch (e) {
    errorCode.value = e instanceof Error ? e.message : 'invalid'
  } finally {
    busy.value = false
    input.value = ''
  }
}

function setCategory(index: number, category: string) {
  const row = preview.value[index]
  if (row) row.category = category
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
          multiple
          :disabled="busy"
          class="mt-2 block w-full text-sm"
          @change="onFileChange"
        />
      </label>
      <ul v-if="files.length" class="mt-2 space-y-0.5 text-sm">
        <li v-for="file in files" :key="file.name" :class="file.errorCode ? 'text-danger' : 'text-muted'">
          {{
            t('import.fileResult', {
              name: file.name,
              kind: file.errorCode ? errorMessage(file.errorCode) : t(`import.detected.${file.kind}`),
            })
          }}
        </li>
      </ul>
      <p v-if="busy" class="mt-2 text-sm text-muted">{{ t('import.reading') }}</p>
      <p v-if="errorCode" class="mt-2 text-sm text-danger">{{ errorMessage(errorCode) }}</p>
      <p v-if="allAlreadyImported" class="mt-2 text-sm text-muted">{{ t('import.allAlreadyImported') }}</p>
    </section>

    <ImportPreview
      :preview="preview"
      :skipped="skipped"
      :importing="busy"
      @import="runImport"
      @set-category="setCategory"
    />

    <p v-if="importedCount != null" class="text-sm text-success">
      {{ t('import.done', { count: importedCount }) }}
    </p>
  </div>
</template>
