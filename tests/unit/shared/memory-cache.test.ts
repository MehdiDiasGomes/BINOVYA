import { describe, expect, it } from 'vitest'

import { createMemoryCache } from '../../../server/utils/memoryCache'

const NOW = 1_000

describe('createMemoryCache', () => {
  it('returns undefined for an unknown key', () => {
    expect(createMemoryCache<string>(2).read('a', NOW)).toBeUndefined()
  })

  it('returns a live entry', () => {
    const cache = createMemoryCache<string>(2)
    cache.write('a', 'A', NOW + 10)
    expect(cache.read('a', NOW)).toBe('A')
  })

  it('treats an entry as expired at expiresAt, not after', () => {
    const cache = createMemoryCache<string>(2)
    cache.write('a', 'A', NOW + 10)
    expect(cache.read('a', NOW + 9)).toBe('A')
    expect(cache.read('a', NOW + 10)).toBeUndefined()
  })

  it('forgets an expired entry for good', () => {
    const cache = createMemoryCache<string>(2)
    cache.write('a', 'A', NOW + 10)
    cache.read('a', NOW + 10)
    expect(cache.read('a', NOW)).toBeUndefined()
  })

  it('evicts the least recently read entry, not the first written', () => {
    const cache = createMemoryCache<string>(2)
    cache.write('a', 'A', NOW + 100)
    cache.write('b', 'B', NOW + 100)
    cache.read('a', NOW)
    cache.write('c', 'C', NOW + 100)
    expect(cache.read('a', NOW)).toBe('A')
    expect(cache.read('b', NOW)).toBeUndefined()
    expect(cache.read('c', NOW)).toBe('C')
  })

  it('evicts the first written entry when nothing was read', () => {
    const cache = createMemoryCache<string>(2)
    cache.write('a', 'A', NOW + 100)
    cache.write('b', 'B', NOW + 100)
    cache.write('c', 'C', NOW + 100)
    expect(cache.read('a', NOW)).toBeUndefined()
    expect(cache.read('b', NOW)).toBe('B')
  })

  it('evicts nothing when an existing key is rewritten', () => {
    const cache = createMemoryCache<string>(2)
    cache.write('a', 'A', NOW + 100)
    cache.write('b', 'B', NOW + 100)
    cache.write('a', 'A2', NOW + 100)
    expect(cache.read('a', NOW)).toBe('A2')
    expect(cache.read('b', NOW)).toBe('B')
  })

  it('keeps a null value and returns it', () => {
    const cache = createMemoryCache<string | null>(2)
    cache.write('a', null, NOW + 100)
    expect(cache.read('a', NOW)).toBeNull()
  })
})
