import { defineStore } from 'pinia'
import { ref } from 'vue'

import { db } from '@/db'
import {
  DEFAULT_SETTINGS,
  rowsToSettings,
  settingsToRows,
  validateSettings,
  type AppSettings,
} from '@/domain/settings'

export const useSettingsStore = defineStore('settings', () => {
  const settings = ref<AppSettings>({ ...DEFAULT_SETTINGS })
  const loaded = ref(false)

  async function load(): Promise<void> {
    const rows = await db.settings.toArray()
    settings.value = rows.length > 0 ? rowsToSettings(rows) : validateSettings({})
    loaded.value = true
  }

  async function save(partial: Partial<AppSettings>): Promise<void> {
    settings.value = validateSettings({ ...settings.value, ...partial })
    await db.settings.bulkPut(settingsToRows(settings.value))
  }

  return { settings, loaded, load, save }
})
