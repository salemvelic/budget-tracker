<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

import { monthRange, shiftMonth } from '@/domain/month'

const model = defineModel<string>({ required: true })
const { t } = useI18n()

const label = computed(() => {
  const { start } = monthRange(model.value)
  const date = new Date(`${start}T12:00:00`)
  return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(date)
})

function previousMonth() {
  model.value = shiftMonth(model.value, -1)
}

function nextMonth() {
  model.value = shiftMonth(model.value, 1)
}
</script>

<template>
  <div class="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-muted p-3">
    <button
      type="button"
      class="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface"
      :aria-label="t('common.previousMonth')"
      @click="previousMonth"
    >
      ←
    </button>
    <p class="text-sm font-semibold capitalize">{{ label }}</p>
    <button
      type="button"
      class="rounded-lg border border-border px-3 py-2 text-sm font-medium hover:bg-surface"
      :aria-label="t('common.nextMonth')"
      @click="nextMonth"
    >
      →
    </button>
  </div>
</template>
