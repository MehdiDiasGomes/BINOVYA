import { describe, expect, it } from 'vitest'

import { BASE_URL } from '../../support/env'

const NOINDEX_PATHS: string[] = ['/login', '/en/login', '/pro/login', '/account/confirm']
const ROBOTS_META: RegExp = /<meta[^>]+name="robots"[^>]*>/i

const fetchRobotsMeta = async (path: string): Promise<string> => {
  const response: Response = await fetch(`${BASE_URL}${path}`)
  expect(response.status).toBe(200)
  return ROBOTS_META.exec(await response.text())?.[0] ?? ''
}

describe('private pages stay out of the index', () => {
  it.each(NOINDEX_PATHS)('%s asks robots for noindex', async (path: string) => {
    expect(await fetchRobotsMeta(path)).toMatch(/noindex/)
  })

  it('the homepage does not forbid indexing', async () => {
    expect(await fetchRobotsMeta('/')).not.toMatch(/noindex/)
  })
})
