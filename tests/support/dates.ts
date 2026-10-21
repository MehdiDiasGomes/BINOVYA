import { signedAddress, THIONVILLE_ADDRESS } from './address'
import { DAY_CAPACITY } from './api'
import { listActiveBookingDates } from './db'
import { BASE_URL } from './env'
import { readRules } from './pro'

type AvailabilityDay = { date: string; status: string }

/**
 * Picks bookable days for tests: available for an in-area address according to the app itself
 * (lead time, horizon, weekly rules, overrides), without any active booking in the database, and
 * whose weekday has exactly the capacity the capacity tests fill (`DAY_CAPACITY`).
 * Days are taken from the far end of the window to stay away from real customers' dates.
 * @param count - Number of distinct days needed
 * @returns ISO dates, latest first
 */
export const pickFreeDates = async (count: number): Promise<string[]> => {
  const response: Response = await fetch(`${BASE_URL}/api/booking/availability`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(signedAddress(THIONVILLE_ADDRESS)),
  })
  const body = (await response.json()) as { days: AvailabilityDay[] }
  const booked: Set<string> = await listActiveBookingDates()
  const capacityOf: Map<number, number> = new Map(
    (await readRules()).map(rule => [rule.weekday, rule.maxBookings]),
  )
  const free: string[] = body.days
    .filter(
      day =>
        day.status === 'available' &&
        !booked.has(day.date) &&
        capacityOf.get(new Date(`${day.date}T00:00:00Z`).getUTCDay()) === DAY_CAPACITY,
    )
    .map(day => day.date)
    .sort()
    .reverse()
  if (free.length < count) {
    throw new Error(`Only ${free.length} free bookable days, ${count} needed`)
  }
  return free.slice(0, count)
}
