import { ref, watch } from 'vue'

const STORAGE_PREFIX = 'budget-tracker:collapsed:'

function readCollapsed(key: string): boolean {
  try {
    return localStorage.getItem(`${STORAGE_PREFIX}${key}`) === '1'
  } catch {
    return false
  }
}

/** Persists section collapsed state in localStorage (true = minimized). */
export function useCollapsed(key: string) {
  const collapsed = ref(readCollapsed(key))

  watch(collapsed, (value) => {
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, value ? '1' : '0')
    } catch {
      /* ignore */
    }
  })

  function toggle() {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
