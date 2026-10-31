<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

import AppNav from '@/components/AppNav.vue'
import { useSettingsStore } from '@/stores/settings'

const { t } = useI18n()
const route = useRoute()
const settingsStore = useSettingsStore()

onMounted(() => {
  void settingsStore.load()
})

const pageTitle = computed(() => {
  const key = route.meta.titleKey
  return typeof key === 'string' ? t(key) : t('app.title')
})
</script>

<template>
  <div class="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pb-24 pt-6 md:pb-8">
    <header class="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
      <div>
        <p class="text-sm text-muted">{{ t('app.title') }}</p>
        <h1 class="text-2xl font-semibold tracking-tight">{{ pageTitle }}</h1>
      </div>
      <div class="hidden md:block">
        <AppNav />
      </div>
    </header>

    <main class="flex-1">
      <RouterView />
    </main>

    <div class="md:hidden">
      <AppNav />
    </div>
  </div>
</template>
