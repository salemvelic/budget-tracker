<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { readBackupData, restoreBackupData } from '@/db/backup'
import { buildBackup, parseBackup } from '@/domain/backup'
import {
  backupFileLabel,
  chooseBackupFile,
  saveBackupToFile,
  supportsBackupFilePicker,
} from '@/services/backupFile'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const persisted = ref<boolean | null>(null)
const message = ref<{
  kind: 'success' | 'danger'
  key: string
  params?: Record<string, string>
} | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)
const targetFile = ref<string | null>(null)

async function refreshFileLabel() {
  targetFile.value = supportsBackupFilePicker() ? await backupFileLabel() : null
}

onMounted(async () => {
  persisted.value = (await navigator.storage?.persisted?.()) ?? null
  await refreshFileLabel()
})

async function exportBackup() {
  const json = JSON.stringify(buildBackup(await readBackupData()), null, 2)
  const mode = await saveBackupToFile(json)
  await settingsStore.save({ lastBackupAt: Date.now() })
  await refreshFileLabel()
  message.value = {
    kind: 'success',
    key: mode === 'file' ? 'settings.backup.savedToFile' : 'settings.backup.exported',
    params: mode === 'file' && targetFile.value ? { name: targetFile.value } : undefined,
  }
}

async function changeBackupFile() {
  if (await chooseBackupFile()) {
    await refreshFileLabel()
    message.value = {
      kind: 'success',
      key: 'settings.backup.fileTarget',
      params: targetFile.value ? { name: targetFile.value } : undefined,
    }
  }
}

async function onRestoreFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  try {
    const data = parseBackup(await file.text())
    if (!window.confirm(t('settings.backup.confirmRestore', { count: data.txns.length }))) return
    await restoreBackupData(data)
    await settingsStore.load()
    message.value = { kind: 'success', key: 'settings.backup.restored' }
  } catch (e) {
    const code = e instanceof Error && e.message === 'backup.version' ? 'version' : 'invalid'
    message.value = { kind: 'danger', key: `settings.backup.errors.${code}` }
  }
}
</script>

<template>
  <section class="border-border bg-surface-muted space-y-4 rounded-xl border p-6">
    <div>
      <h2 class="font-semibold">{{ t('settings.backup.heading') }}</h2>
      <p class="text-muted mt-1 text-sm">{{ t('settings.backup.help') }}</p>
      <p v-if="targetFile" class="text-muted mt-1 text-xs">
        {{ t('settings.backup.fileTarget', { name: targetFile }) }}
        <button type="button" class="text-brand ml-1 underline" @click="changeBackupFile">
          {{ t('settings.backup.changeFile') }}
        </button>
      </p>
    </div>
    <div class="flex flex-wrap gap-3">
      <button
        type="button"
        class="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium"
        @click="exportBackup"
      >
        {{ t('settings.backup.export') }}
      </button>
      <button
        type="button"
        class="border-border rounded-lg border px-4 py-2 text-sm font-medium"
        @click="fileInput?.click()"
      >
        {{ t('settings.backup.restore') }}
      </button>
      <input
        ref="fileInput"
        type="file"
        accept=".json,application/json"
        class="hidden"
        @change="onRestoreFile"
      />
    </div>
    <p
      v-if="message"
      class="text-sm"
      :class="message.kind === 'success' ? 'text-success' : 'text-danger'"
    >
      {{ message.params ? t(message.key, message.params) : t(message.key) }}
    </p>
    <p v-if="persisted != null" class="text-muted text-xs">
      {{ persisted ? t('settings.backup.persisted') : t('settings.backup.notPersisted') }}
    </p>
  </section>
</template>
