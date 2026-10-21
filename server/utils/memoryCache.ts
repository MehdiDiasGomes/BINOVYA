type CacheEntry<Value> = {
  value: Value
  expiresAt: number
}

export type MemoryCache<Value> = {
  read: (key: string, now: number) => Value | undefined
  write: (key: string, value: Value, expiresAt: number) => void
}

/**
 * Creates a per-instance, bounded in-memory cache with an expiry per entry. A read moves the
 * entry to the most recent position; once full, the least recently used entry leaves first.
 * @param maxEntries - Maximum number of entries kept at once
 * @returns Functions to read a live entry and to write one with its absolute expiry
 */
export const createMemoryCache = <Value>(maxEntries: number): MemoryCache<Value> => {
  const entries: Map<string, CacheEntry<Value>> = new Map()

  const read = (key: string, now: number): Value | undefined => {
    const entry: CacheEntry<Value> | undefined = entries.get(key)
    if (!entry) {
      return undefined
    }
    entries.delete(key)
    if (entry.expiresAt <= now) {
      return undefined
    }
    entries.set(key, entry)
    return entry.value
  }

  const write = (key: string, value: Value, expiresAt: number): void => {
    entries.delete(key)
    if (entries.size >= maxEntries) {
      const oldest: string | undefined = entries.keys().next().value
      if (oldest !== undefined) {
        entries.delete(oldest)
      }
    }
    entries.set(key, { value, expiresAt })
  }

  return { read, write }
}
