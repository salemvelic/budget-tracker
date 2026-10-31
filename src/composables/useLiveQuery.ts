import { liveQuery } from 'dexie'
import { onUnmounted, ref, type Ref } from 'vue'

export function useLiveQuery<T>(query: () => T | Promise<T>, initial: T): Ref<T> {
  const data = ref(initial) as Ref<T>
  const subscription = liveQuery(query).subscribe({
    next: (value) => {
      data.value = value
    },
  })
  onUnmounted(() => subscription.unsubscribe())
  return data
}
