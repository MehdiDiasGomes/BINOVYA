import { addDaysToIsoDate, isoDateInTimeZone } from '../../../app/utils/date'
import { rest } from '../../support/db'

type SeedOptions = {
  email: string
  scheduledDate: string
  status: 'paid' | 'pending_payment' | 'cancelled' | 'expired'
  reminderSentAt?: string | null
}

export type SeededBooking = { id: string; email: string; customerId: string }

export type ReminderState = { id: string; reminder_sent_at: string | null }

/**
 * Returns the Paris calendar date shifted by a number of days.
 * @param offsetDays - Days from today in Paris, negative for the past
 * @returns ISO date `YYYY-MM-DD`
 */
export const parisDateFromToday = (offsetDays: number): string =>
  addDaysToIsoDate(isoDateInTimeZone(new Date(), 'Europe/Paris'), offsetDays)

const createAuthUser = async (email: string): Promise<string> => {
  const response: Response = await rest('/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({ email, email_confirm: true }),
  })
  return ((await response.json()) as { id: string }).id
}

/**
 * Inserts a customer and one booking directly in the test database, bypassing the lead time
 * rule so a booking can be due tomorrow. Cleaned up by `cleanupE2eData` through the email.
 * @param options - Customer email, intervention date, status and optional reminder timestamp
 * @returns Identifiers of the seeded rows
 */
export const seedBooking = async (options: SeedOptions): Promise<SeededBooking> => {
  const customerId: string = await createAuthUser(options.email)
  await rest('/rest/v1/profiles', {
    method: 'POST',
    body: JSON.stringify({
      id: customerId,
      email: options.email,
      first_name: 'Rappel',
      last_name: 'Test',
      phone: '+33612345678',
    }),
  })
  const response: Response = await rest('/rest/v1/bookings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      customer_id: customerId,
      scheduled_date: options.scheduledDate,
      address: '12 rue de la Gare, 57100 Thionville',
      city: 'Thionville',
      postcode: '57100',
      latitude: 49.3595,
      longitude: 6.1685,
      status: options.status,
      plan: 'one_off',
      small_bin_count: 1,
      large_bin_count: 0,
      amount_total_cents: 1990,
      bins_ready_confirmed_at: new Date().toISOString(),
      reminder_sent_at: options.reminderSentAt ?? null,
    }),
  })
  const [row] = (await response.json()) as { id: string }[]
  if (!row) {
    throw new Error('Booking seed failed')
  }
  return { id: row.id, email: options.email, customerId }
}

/**
 * Lists paid bookings of real customers still waiting for a reminder in a date window.
 * @param window - First and last ISO dates
 * @returns Booking ids found
 */
export const listForeignDueBookings = async (window: {
  from: string
  to: string
}): Promise<string[]> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=id,profiles!inner(email)&status=eq.paid&reminder_sent_at=is.null&scheduled_date=gte.${window.from}&scheduled_date=lte.${window.to}`,
  )
  const rows = (await response.json()) as { id: string; profiles: { email: string } }[]
  return rows
    .filter(row => !/^delivered\+e2e-.+@resend\.dev$/.test(row.profiles.email))
    .map(row => row.id)
}

/**
 * Reads the reminder timestamp of a booking.
 * @param bookingId - Booking identifier
 * @returns Reminder state, null when the row does not exist
 */
export const readReminderState = async (bookingId: string): Promise<ReminderState | null> => {
  const response: Response = await rest(
    `/rest/v1/bookings?select=id,reminder_sent_at&id=eq.${bookingId}`,
  )
  const [row] = (await response.json()) as ReminderState[]
  return row ?? null
}
