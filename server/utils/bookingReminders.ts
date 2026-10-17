import type { Database } from '@/types/database.types'
import type { BookingEmailData, CustomerEmailRow, ReminderRunResult } from '@/types/email'
import type { SupabaseClient } from '@supabase/supabase-js'

import { generateBookingReminderEmail } from '@/templates/email/bookingCustomerEmails'
import { addDaysToIsoDate, businessToday } from '@/utils/date'

export const REMINDER_LEAD_DAYS = 2

const SEND_INTERVAL_MS = 600

const pause = (milliseconds: number): Promise<void> =>
  new Promise(resolve => {
    setTimeout(resolve, milliseconds)
  })

/**
 * Returns the window of intervention dates whose reminder is due: J-2, plus J-1 to catch up a
 * booking paid after the previous run or a missed run.
 * @param now - Current instant
 * @returns First and last ISO dates of the window, in the Paris time zone
 */
export const reminderDateWindow = (now: Date): { from: string; to: string } => {
  const today: string = businessToday(now)
  return { from: addDaysToIsoDate(today, 1), to: addDaysToIsoDate(today, REMINDER_LEAD_DAYS) }
}

const loadDueReminders = async (
  client: SupabaseClient<Database>,
  now: Date,
): Promise<BookingEmailData[]> => {
  const { from, to } = reminderDateWindow(now)
  const { data: bookings, error } = await client
    .from('bookings')
    .select(BOOKING_EMAIL_COLUMNS)
    .eq('status', 'paid')
    .is('reminder_sent_at', null)
    .gte('scheduled_date', from)
    .lte('scheduled_date', to)
  if (error) {
    throw createError({ statusCode: 500, statusMessage: 'Reminder lookup failed' })
  }
  if (bookings.length === 0) {
    return []
  }
  const customerIds: string[] = [...new Set(bookings.map(booking => booking.customer_id))]
  const { data: customers, error: customerError } = await client
    .from('profiles')
    .select(CUSTOMER_EMAIL_COLUMNS)
    .in('id', customerIds)
  if (customerError) {
    throw createError({ statusCode: 500, statusMessage: 'Reminder customer lookup failed' })
  }
  return bookings.flatMap(booking => {
    const customer: CustomerEmailRow | undefined = customers.find(
      entry => entry.id === booking.customer_id,
    )
    return customer ? [toBookingEmailData(booking, customer)] : []
  })
}

const sendReminder = async (
  client: SupabaseClient<Database>,
  booking: BookingEmailData,
): Promise<boolean> => {
  const isSent: boolean = await sendToCustomer(
    booking,
    generateBookingReminderEmail(booking, escapeHtml),
    'reminder',
  )
  if (!isSent) {
    return false
  }
  const { error } = await client
    .from('bookings')
    .update({ reminder_sent_at: new Date().toISOString() })
    .eq('id', booking.id)
    .is('reminder_sent_at', null)
  if (error) {
    console.error(`Reminder sent but not recorded for booking ${booking.id}`)
  }
  return true
}

/**
 * Emails a reminder to every paid booking whose intervention is due in the next two days and
 * records `reminder_sent_at`, conditioned on it still being empty. Bookings are handled one by
 * one to stay under the Resend rate limit; a failed send is retried on the next run.
 * @param client - Supabase client using the secret key
 * @param now - Current instant, injectable for tests
 * @returns Number of reminders sent and failed
 */
export const sendDueBookingReminders = async (
  client: SupabaseClient<Database>,
  now: Date = new Date(),
): Promise<ReminderRunResult> => {
  const bookings: BookingEmailData[] = await loadDueReminders(client, now)
  return bookings.reduce<Promise<ReminderRunResult>>(
    async (previous, booking) => {
      const result: ReminderRunResult = await previous
      if (result.sent + result.failed > 0) {
        await pause(SEND_INTERVAL_MS)
      }
      const isSent: boolean = await sendReminder(client, booking)
      return isSent
        ? { ...result, sent: result.sent + 1 }
        : { ...result, failed: result.failed + 1 }
    },
    Promise.resolve({ sent: 0, failed: 0 }),
  )
}
