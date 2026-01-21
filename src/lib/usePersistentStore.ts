import { useEffect, useRef, useState } from 'react'
import localforage from 'localforage'

// IndexedDB-backed key-value store for the app.
const store = localforage.createInstance({
  name: 'pa-db',
  storeName: 'kv',
  description: 'Personal Assistant data (settings, tasks, money, workouts)',
})

export type PersistentState<T> = readonly [T, (next: T) => void, boolean]

/**
 * React hook to persist state in IndexedDB (via localforage).
 * Returns [value, setValue, hydrated], where hydrated is true when initial load finished.
 */
export function usePersistentStoreState<T>(key: string, initialValue: T): PersistentState<T> {
  const [value, setValue] = useState<T>(initialValue)
  const [hydrated, setHydrated] = useState(false)
  const keyRef = useRef(key)

  // Initial load
  useEffect(() => {
    let cancelled = false
    store
      .getItem<T>(keyRef.current)
      .then((saved) => {
        if (cancelled) return
        if (saved != null) setValue(saved)
      })
      .catch((err) => {
        console.error('Не удалось прочитать данные из IndexedDB', err)
      })
      .finally(() => {
        if (!cancelled) setHydrated(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Persist after hydration to avoid clobbering stored value with initialValue
  useEffect(() => {
    if (!hydrated) return
    store.setItem(key, value).catch((err) => {
      console.error('Не удалось сохранить данные в IndexedDB', err)
    })
  }, [key, value, hydrated])

  return [value, setValue, hydrated] as const
}

