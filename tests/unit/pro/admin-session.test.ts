import { describe, expect, it } from 'vitest'

import { hasAdminRole, isActiveAdminClaims } from '../../../app/utils/adminSession'

const NOW = 1_800_000_000

const DAY = 24 * 3600

const adminWith = (method: string, ageSeconds: number): Record<string, unknown> => ({
  app_metadata: { role: 'admin' },
  amr: [{ method, timestamp: NOW - ageSeconds }],
})

describe('hasAdminRole', () => {
  it('accepts the admin role in app_metadata', () => {
    expect(hasAdminRole({ app_metadata: { role: 'admin' } })).toBe(true)
  })

  it('ignores user_metadata, which the user can edit', () => {
    expect(hasAdminRole({ user_metadata: { role: 'admin' } } as never)).toBe(false)
  })

  it('refuses another role', () => {
    expect(hasAdminRole({ app_metadata: { role: 'customer' } })).toBe(false)
  })

  it('refuses a role in another case', () => {
    expect(hasAdminRole({ app_metadata: { role: 'Admin' } })).toBe(false)
  })

  it('refuses null claims and claims without app_metadata', () => {
    expect(hasAdminRole(null)).toBe(false)
    expect(hasAdminRole({} as never)).toBe(false)
  })
})

describe('isActiveAdminClaims', () => {
  it('accepts an admin signed in 6 days ago with a login link', () => {
    expect(isActiveAdminClaims(adminWith('otp', 6 * DAY) as never, NOW)).toBe(true)
  })

  it('accepts the magiclink method', () => {
    expect(isActiveAdminClaims(adminWith('magiclink', 60) as never, NOW)).toBe(true)
  })

  it('accepts exactly 7 days and refuses 7 days and one second', () => {
    expect(isActiveAdminClaims(adminWith('otp', 7 * DAY) as never, NOW)).toBe(true)
    expect(isActiveAdminClaims(adminWith('otp', 7 * DAY + 1) as never, NOW)).toBe(false)
  })

  it('refuses an admin whose session was opened by password', () => {
    expect(isActiveAdminClaims(adminWith('password', 0) as never, NOW)).toBe(false)
  })

  it('refuses a fresh login link on a non admin account', () => {
    const claims = { app_metadata: { role: 'customer' }, amr: [{ method: 'otp', timestamp: NOW }] }
    expect(isActiveAdminClaims(claims as never, NOW)).toBe(false)
  })

  it('refuses an admin without amr and null claims', () => {
    expect(isActiveAdminClaims({ app_metadata: { role: 'admin' } } as never, NOW)).toBe(false)
    expect(isActiveAdminClaims(null, NOW)).toBe(false)
  })
})
