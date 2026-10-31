<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { RouterLink, useRoute } from 'vue-router'

const { t } = useI18n()
const route = useRoute()

const links = [
  { name: 'dashboard', labelKey: 'nav.dashboard' },
  { name: 'transactions', labelKey: 'nav.transactions' },
  { name: 'import', labelKey: 'nav.import' },
  { name: 'budget', labelKey: 'nav.budget' },
  { name: 'settings', labelKey: 'nav.settings' },
] as const

function linkClass(name: string) {
  const active = route.name === name
  return active
    ? 'bg-brand text-brand-foreground'
    : 'text-muted hover:bg-surface-muted hover:text-foreground'
}
</script>

<template>
  <nav
    class="border-border bg-surface/95 fixed inset-x-0 bottom-0 z-10 border-t backdrop-blur md:static md:border-t-0 md:bg-transparent md:backdrop-blur-none"
    aria-label="Main"
  >
    <ul
      class="mx-auto flex max-w-3xl justify-around gap-1 px-2 py-2 md:justify-start md:gap-2 md:px-0"
    >
      <li v-for="link in links" :key="link.name">
        <RouterLink
          :to="{ name: link.name }"
          class="block rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="linkClass(link.name)"
        >
          {{ t(link.labelKey) }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>
