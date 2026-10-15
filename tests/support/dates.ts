import { listActiveBookingDates } from './db'

const BASE_URL: string = process.env.TEST_BASE_URL ?? 'http://localhost:3000'
const IN_AREA_POINT = { latitude: 49.3595, longitude: 6.1685 }

type AvailabilityDay = { date: string; status: string }

/**
 * Picks bookable days for tests: available for an in-area address according to the app itself
 * (lead time, horizon, weekly rules, overrides), without any active booking in the database.
 * Days are taken from the far end of the window to stay away from real customers' dates.
 * @param count - Number of distinct days needed
 * @returns ISO dates, latest first
 */
export const pickFreeDates = async (count: number): Promise<string[]> => {
  const query = new URLSearchParams({
    latitude: String(IN_AREA_POINT.latitude),
    longitude: String(IN_AREA_POINT.longitude),
  })
  const response: Response = await fetch(`${BASE_URL}/api/booking/availability?${query}`)
  const body = (await response.json()) as { days: AvailabilityDay[] }
  const booked: Set<string> = await listActiveBookingDates()
  const free: string[] = body.days
    .filter(day => day.status === 'available' && !booked.has(day.date))
    .map(day => day.date)
    .sort()
    .reverse()
  if (free.length < count) {
    throw new Error(`Only ${free.length} free bookable days, ${count} needed`)
  }
  return free.slice(0, count)
}
