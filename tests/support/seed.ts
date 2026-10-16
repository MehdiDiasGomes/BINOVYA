import { createCustomer, seedAccountBooking, type AccountCustomer } from './account'
import { E2E_EMAIL_PATTERN, rest } from './db'
import { addDaysToIsoDate, isoDateInTimeZone } from '../../app/utils/date'

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

/**
 * Inserts a customer and one booking directly in the test database, bypassing the lead time
 * rule so a booking can be due tomorrow. Cleaned up by `cleanupE2eData` through the email.
 * @param options - Customer email, intervention date, status and optional reminder timestamp
 * @returns Identifiers of the seeded rows
 */
export const seedBooking = async (options: SeedOptions): Promise<SeededBooking> => {
  const customer: AccountCustomer = await createCustomer({
    email: options.email,
    firstName: 'Rappel',
  })
  const id: string = await seedAccountBooking({
    customerId: customer.id,
    status: options.status,
    scheduledDate: options.scheduledDate,
    reminderSentAt: options.reminderSentAt,
  })
  return { id, email: options.email, customerId: customer.id }
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
  return rows.filter(row => !E2E_EMAIL_PATTERN.test(row.profiles.email)).map(row => row.id)
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
