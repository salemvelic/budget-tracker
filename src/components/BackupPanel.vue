<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { readBackupData, restoreBackupData } from '@/db/backup'
import { backupFileName, buildBackup, parseBackup } from '@/domain/backup'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const persisted = ref<boolean | null>(null)
const message = ref<{ kind: 'success' | 'danger'; key: string } | null>(null)
const fileInput = ref<HTMLInputElement | null>(null)

onMounted(async () => {
  persisted.value = (await navigator.storage?.persisted?.()) ?? null
})

async function exportBackup() {
  const file = buildBackup(await readBackupData())
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' }),
  )
  const link = document.createElement('a')
  link.href = url
  link.download = backupFileName()
  link.click()
  URL.revokeObjectURL(url)
  message.value = { kind: 'success', key: 'settings.backup.exported' }
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
      {{ t(message.key) }}
    </p>
    <p v-if="persisted != null" class="text-muted text-xs">
      {{ persisted ? t('settings.backup.persisted') : t('settings.backup.notPersisted') }}
    </p>
  </section>
</template>
