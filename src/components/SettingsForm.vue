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
  <form
    class="border-border bg-surface-muted space-y-4 rounded-xl border p-6"
    @submit.prevent="submit"
  >
    <h2 class="font-semibold">{{ t('settings.limitsHeading') }}</h2>
    <label v-for="field in fields" :key="field.key" class="block space-y-1 text-sm">
      <span class="text-muted">{{ t(field.labelKey) }}</span>
      <input
        v-model="form[field.key]"
        type="text"
        inputmode="decimal"
        class="border-border bg-surface w-full rounded-lg border px-3 py-2 tabular-nums"
        @input="status = 'idle'"
      />
      <span v-if="field.hintKey" class="text-muted block text-xs">{{ t(field.hintKey) }}</span>
    </label>
    <button
      type="submit"
      class="bg-brand text-brand-foreground rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
      :disabled="!parsed"
    >
      {{ t('common.save') }}
    </button>
    <p v-if="status === 'saved'" class="text-success text-sm">{{ t('settings.saved') }}</p>
    <p v-if="status === 'error'" class="text-danger text-sm">{{ t('settings.saveFailed') }}</p>
  </form>
</template>
