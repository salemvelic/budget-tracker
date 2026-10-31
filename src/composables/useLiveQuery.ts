import { liveQuery, type Subscription } from 'dexie'
import { onScopeDispose, ref, watch, type Ref, type WatchSource } from 'vue'

export function useLiveQuery<T>(
  query: () => T | Promise<T>,
  initial: T,
  deps?: WatchSource | WatchSource[],
): Ref<T> {
  const data = ref(initial) as Ref<T>
  let subscription: Subscription | undefined

  const start = () => {
    subscription?.unsubscribe()
    subscription = liveQuery(query).subscribe({
      next: (value) => {
        data.value = value
      },
    })
  }

  if (deps) {
    watch(deps, start, { immediate: true })
  } else {
    start()
  }

  onScopeDispose(() => subscription?.unsubscribe())

  return data
}
