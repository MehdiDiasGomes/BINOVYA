import { describe, expect, it } from 'vitest'

import { paymentLinkExpiresAt } from '../../../server/utils/proCreateBooking'

const NOW = Date.parse('2026-10-20T10:00:00Z')

const HOLD_MINUTES = 1435

const seconds = (instant: number): number => Math.floor(instant / 1000)

describe('paymentLinkExpiresAt', () => {
  it('closes the session one minute before the end of the hold', () => {
    const hold = new Date(NOW + 2 * 3600_000).toISOString()
    expect(paymentLinkExpiresAt(hold, NOW)).toBe(seconds(NOW) + 2 * 3600 - 60)
  })

  it('never goes beyond the 24 hours Stripe allows, minus the margin', () => {
    const hold = new Date(NOW + 48 * 3600_000).toISOString()
    expect(paymentLinkExpiresAt(hold, NOW)).toBe(seconds(NOW) + 24 * 3600 - 60)
  })

  it('stays within the Stripe lifetime for the 1435 minutes hold', () => {
    const hold = new Date(NOW + HOLD_MINUTES * 60_000).toISOString()
    const expiry = paymentLinkExpiresAt(hold, NOW)
    expect(expiry - seconds(NOW)).toBeLessThanOrEqual(24 * 3600)
    expect(expiry * 1000).toBeLessThan(Date.parse(hold))
  })

  it('floors the hold to whole seconds', () => {
    const hold = new Date(NOW + 3600_000 + 999).toISOString()
    expect(paymentLinkExpiresAt(hold, NOW)).toBe(seconds(NOW) + 3600 - 60)
  })

  it('defaults to the current time', () => {
    const hold = new Date(Date.now() + 3600_000).toISOString()
    const expiry = paymentLinkExpiresAt(hold)
    expect(expiry).toBeGreaterThan(seconds(Date.now()) + 3500 - 60)
    expect(expiry).toBeLessThanOrEqual(seconds(Date.now()) + 3600 - 60)
  })
})
