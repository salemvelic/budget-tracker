<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { RouterLink } from 'vue-router'

import ImportPreview from '@/components/ImportPreview.vue'
import { useLiveQuery } from '@/composables/useLiveQuery'
import { filterNewImportRows, importParsedRows } from '@/db/importRows'
import { db, type CategoryRule } from '@/db'
import { categorizeDescription, DEFAULT_CATEGORY_RULES } from '@/domain/categorize'
import { parsePdfStatement, type PdfStatementKind } from '@/domain/importers/pdfStatement'
import {
  mergeSkipped,
  possibleDuplicates,
  type ImportSkipped,
  type ParsedImportRow,
} from '@/domain/importers/types'

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
const excluded = ref(new Set<string>())
const duplicateHints = ref(new Map<string, string>())
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
  excluded.value = new Set()
  duplicateHints.value = new Map()
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
          result.rows.length === 0
            ? { name: file.name, errorCode: 'empty' }
            : { name: file.name, kind: result.kind },
        )
      } catch (e) {
        files.value.push({ name: file.name, errorCode: e instanceof Error ? e.message : 'invalid' })
      }
    }
    skipped.value = mergeSkipped(...skips)
    const fresh = await filterNewImportRows(rows)
    preview.value = fresh.sort((a, b) => a.date.localeCompare(b.date))
    if (rows.length > 0 && preview.value.length === 0) allAlreadyImported.value = true

    if (fresh.length > 0) {
      const dates = fresh.map((row) => row.date).sort()
      const start = dates[0]!
      const end = dates[dates.length - 1]!
      const existing = await db.txns.where('date').between(start, end, true, true).toArray()
      duplicateHints.value = possibleDuplicates(fresh, existing)
      excluded.value = new Set(duplicateHints.value.keys())
    }
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

function toggleInclude(importHash: string, include: boolean) {
  const next = new Set(excluded.value)
  if (include) next.delete(importHash)
  else next.add(importHash)
  excluded.value = next
}

async function runImport() {
  const rows = preview.value.filter((row) => !excluded.value.has(row.importHash))
  if (rows.length === 0) return
  busy.value = true
  errorCode.value = ''
  try {
    importedCount.value = await importParsedRows(rows)
    preview.value = []
    skipped.value = {}
    excluded.value = new Set()
    duplicateHints.value = new Map()
  } catch {
    errorCode.value = 'import.failed'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <section class="border-border bg-surface-muted rounded-xl border p-6">
      <p class="text-muted mb-4 text-sm">{{ t('import.help') }}</p>
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
        <li
          v-for="file in files"
          :key="file.name"
          :class="file.errorCode ? 'text-danger' : 'text-muted'"
        >
          {{
            t('import.fileResult', {
              name: file.name,
              kind: file.errorCode
                ? errorMessage(file.errorCode)
                : t(`import.detected.${file.kind}`),
            })
          }}
        </li>
      </ul>
      <p v-if="busy" class="text-muted mt-2 text-sm">{{ t('import.reading') }}</p>
      <p v-if="errorCode" class="text-danger mt-2 text-sm">{{ errorMessage(errorCode) }}</p>
      <p v-if="allAlreadyImported" class="text-muted mt-2 text-sm">
        {{ t('import.allAlreadyImported') }}
      </p>
    </section>

    <ImportPreview
      :preview="preview"
      :skipped="skipped"
      :importing="busy"
      :excluded="excluded"
      :duplicate-hints="duplicateHints"
      @import="runImport"
      @set-category="setCategory"
      @toggle-include="toggleInclude"
    />

    <p v-if="importedCount != null" class="text-success text-sm">
      {{ t('import.done', { count: importedCount }) }}
      <RouterLink to="/settings" class="text-brand ml-1 underline">
        {{ t('import.backupReminder') }}
      </RouterLink>
    </p>
  </div>
</template>
