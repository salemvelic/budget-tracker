<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useI18n } from 'vue-i18n'

import { formatAmountInput, parseHrAmount } from '@/domain/money'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const settingsStore = useSettingsStore()

const status = ref<'idle' | 'saved' | 'error'>('idle')
const form = reactive({
  monthlyLimit: '',
  emergencyTarget: '',
  emergencySaved: '',
})

onMounted(async () => {
  await settingsStore.load()
  form.monthlyLimit = formatAmountInput(settingsStore.settings.monthlyLimitCents)
  form.emergencyTarget = formatAmountInput(settingsStore.settings.emergencyTargetCents)
  form.emergencySaved = formatAmountInput(settingsStore.settings.emergencySavedCents)
})

const parsed = computed(() => {
  try {
    return {
      monthlyLimitCents: parseHrAmount(form.monthlyLimit),
      emergencyTargetCents: parseHrAmount(form.emergencyTarget),
      emergencySavedCents: parseHrAmount(form.emergencySaved),
    }
  } catch {
    return null
  }
})

const fields = [
  { key: 'monthlyLimit', labelKey: 'settings.monthlyLimit', hintKey: 'settings.monthlyLimitHint' },
  { key: 'emergencyTarget', labelKey: 'settings.emergencyTarget', hintKey: null },
  { key: 'emergencySaved', labelKey: 'settings.emergencySaved', hintKey: null },
] as const

async function submit() {
  if (!parsed.value) return
  try {
    await settingsStore.save(parsed.value)
    status.value = 'saved'
  } catch {
    status.value = 'error'
  }
}
</script>

<template>
  <form class="space-y-4 rounded-xl border border-border bg-surface-muted p-6" @submit.prevent="submit">
    <h2 class="font-semibold">{{ t('settings.limitsHeading') }}</h2>
    <label v-for="field in fields" :key="field.key" class="block space-y-1 text-sm">
      <span class="text-muted">{{ t(field.labelKey) }}</span>
      <input
        v-model="form[field.key]"
        type="text"
        inputmode="decimal"
        class="w-full rounded-lg border border-border bg-surface px-3 py-2 tabular-nums"
        @input="status = 'idle'"
      />
      <span v-if="field.hintKey" class="block text-xs text-muted">{{ t(field.hintKey) }}</span>
    </label>
    <button
      type="submit"
      class="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-brand-foreground disabled:opacity-50"
      :disabled="!parsed"
    >
      {{ t('common.save') }}
    </button>
    <p v-if="status === 'saved'" class="text-sm text-success">{{ t('settings.saved') }}</p>
    <p v-if="status === 'error'" class="text-sm text-danger">{{ t('settings.saveFailed') }}</p>
  </form>
</template>
