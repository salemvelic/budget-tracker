<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatEur, parseHrAmount } from '@/domain/money'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const saved = ref(false)
const form = reactive({
  monthlyLimit: '',
  emergencyTarget: '',
  emergencySaved: '',
  statementCloseDay: '19',
})

onMounted(() => {
  void settingsStore.load().then(() => {
    form.monthlyLimit = formatEur(settingsStore.settings.monthlyLimitCents)
    form.emergencyTarget = formatEur(settingsStore.settings.emergencyTargetCents)
    form.emergencySaved = formatEur(settingsStore.settings.emergencySavedCents)
    form.statementCloseDay = String(settingsStore.settings.statementCloseDay)
  })
})

const canSave = computed(() => {
  try {
    parseHrAmount(form.monthlyLimit)
    parseHrAmount(form.emergencyTarget)
    parseHrAmount(form.emergencySaved)
    const day = Number(form.statementCloseDay)
    return Number.isInteger(day) && day >= 1 && day <= 28
  } catch {
    return false
  }
})

async function submit() {
  await settingsStore.save({
    monthlyLimitCents: parseHrAmount(form.monthlyLimit),
    emergencyTargetCents: parseHrAmount(form.emergencyTarget),
    emergencySavedCents: parseHrAmount(form.emergencySaved),
    statementCloseDay: Number(form.statementCloseDay),
  })
  saved.value = true
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-border bg-surface-muted p-6" @submit.prevent="submit">
    <label class="block space-y-1 text-sm">
      <span class="text-muted">{{ t('settings.monthlyLimit') }}</span>
      <input v-model="form.monthlyLimit" type="text" class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums" />
    </label>
    <label class="block space-y-1 text-sm">
      <span class="text-muted">{{ t('settings.emergencyTarget') }}</span>
      <input v-model="form.emergencyTarget" type="text" class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums" />
    </label>
    <label class="block space-y-1 text-sm">
      <span class="text-muted">{{ t('settings.emergencySaved') }}</span>
      <input v-model="form.emergencySaved" type="text" class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums" />
    </label>
    <label class="block space-y-1 text-sm">
      <span class="text-muted">{{ t('settings.statementCloseDay') }}</span>
      <input
        v-model="form.statementCloseDay"
        type="number"
        min="1"
        max="28"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums"
      />
    </label>
    <button
      type="submit"
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      :disabled="!canSave"
    >
      {{ t('common.save') }}
    </button>
    <p v-if="saved" class="text-sm text-success">{{ t('settings.saved') }}</p>
  </form>
</template>
