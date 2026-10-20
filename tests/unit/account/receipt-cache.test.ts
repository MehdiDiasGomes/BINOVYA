import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PAYMENT_RECEIPT_CACHE_TTL_MS,
  PAYMENT_RECEIPT_MISS_CACHE_TTL_MS,
} from '../../../app/constants/account'
import { loadAccountBookingDocuments } from '../../../server/utils/accountDocuments'

import type { AccountBookingRecord } from '../../../app/types/account'
import type { Database } from '../../../app/types/database.types'
import type { SupabaseClient } from '@supabase/supabase-js'

const RECEIPT_URL = 'https://pay.stripe.com/receipts/payment/abc'

const client = {} as SupabaseClient<Database>

const retrieve = vi.fn()

const newRecord = (): AccountBookingRecord =>
  ({
    booking: { id: crypto.randomUUID(), status: 'paid' },
    paymentIntentId: `pi_${crypto.randomUUID()}`,
  }) as AccountBookingRecord

const withReceipt = (url: string | null): void => {
  retrieve.mockResolvedValue({ latest_charge: { receipt_url: url } })
}

beforeEach(() => {
  vi.useFakeTimers()
  retrieve.mockReset()
  vi.stubGlobal('useStripe', () => ({ paymentIntents: { retrieve } }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('receipt cache of loadAccountBookingDocuments', () => {
  it('reads Stripe once for a receipt shown twice', async () => {
    withReceipt(RECEIPT_URL)
    const record = newRecord()
    expect((await loadAccountBookingDocuments(client, record)).receiptUrl).toBe(RECEIPT_URL)
    expect((await loadAccountBookingDocuments(client, record)).receiptUrl).toBe(RECEIPT_URL)
    expect(retrieve).toHaveBeenCalledTimes(1)
  })

  it('keeps a receipt URL for 5 minutes', async () => {
    withReceipt(RECEIPT_URL)
    const record = newRecord()
    await loadAccountBookingDocuments(client, record)
    vi.advanceTimersByTime(PAYMENT_RECEIPT_CACHE_TTL_MS - 1)
    await loadAccountBookingDocuments(client, record)
    expect(retrieve).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    await loadAccountBookingDocuments(client, record)
    expect(retrieve).toHaveBeenCalledTimes(2)
  })

  it('keeps a missing receipt for 30 seconds only', async () => {
    withReceipt(null)
    const record = newRecord()
    expect((await loadAccountBookingDocuments(client, record)).receiptUrl).toBeNull()
    vi.advanceTimersByTime(PAYMENT_RECEIPT_MISS_CACHE_TTL_MS - 1)
    await loadAccountBookingDocuments(client, record)
    expect(retrieve).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(1)
    await loadAccountBookingDocuments(client, record)
    expect(retrieve).toHaveBeenCalledTimes(2)
  })

  it('keeps a Stripe failure for 30 seconds only', async () => {
    retrieve.mockRejectedValue(new Error('down'))
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const record = newRecord()
    expect((await loadAccountBookingDocuments(client, record)).receiptUrl).toBeNull()
    vi.advanceTimersByTime(PAYMENT_RECEIPT_MISS_CACHE_TTL_MS)
    await loadAccountBookingDocuments(client, record)
    expect(retrieve).toHaveBeenCalledTimes(2)
  })

  it('refuses a receipt URL outside stripe.com', async () => {
    withReceipt('https://evil.example.com/receipt')
    expect((await loadAccountBookingDocuments(client, newRecord())).receiptUrl).toBeNull()
  })

  it('does not call Stripe without payment intent', async () => {
    const record = { ...newRecord(), paymentIntentId: null } as AccountBookingRecord
    expect((await loadAccountBookingDocuments(client, record)).receiptUrl).toBeNull()
    expect(retrieve).not.toHaveBeenCalled()
  })
})
