import { describe, expect, it } from 'vitest'

import { resolveTestOutboxDir } from '../../../scripts/test-outbox'

const ROOT = '/project'

describe('resolveTestOutboxDir', () => {
  it.each(['.mail-outbox/test-run', '.mail-outbox/x'])(
    'accepts %s and returns an absolute path under the root',
    dir => {
      expect(resolveTestOutboxDir(dir, ROOT)).toBe(`${ROOT}/${dir}`)
    },
  )

  it.each([
    '.mail-outbox',
    '.mail-outbox/',
    '..',
    '/tmp',
    '.mail-outbox/../src',
    '.mail-outbox-x/a',
  ])('refuses %s', dir => {
    expect(resolveTestOutboxDir(dir, ROOT)).toBeNull()
  })
})
