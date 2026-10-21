import type { GeoPoint } from '@/types/booking'
import type { MapsStop } from '@/types/pro'

import { GOOGLE_MAPS_DIRECTIONS_URL } from '@/constants/navigationApps'
import { GOOGLE_MAPS_MAX_WAYPOINTS } from '@/constants/pro'
import { stopLocation } from '@/utils/geo'

const directionsUrlFrom = (params: URLSearchParams): string =>
  `${GOOGLE_MAPS_DIRECTIONS_URL}?${params.toString()}`

/**
 * Builds a Google Maps directions link from the current position of the phone to one address,
 * with the official URL scheme. Uses the coordinates when they are valid, the address otherwise.
 * @param stop - Coordinates and address text of the destination
 * @returns Absolute Google Maps URL
 */
export const directionsUrl = (stop: MapsStop): string =>
  directionsUrlFrom(
    new URLSearchParams({ api: '1', destination: stopLocation(stop), travelmode: 'driving' }),
  )

/**
 * Builds the Google Maps links of a round from the depot through every stop and back to the
 * depot, in the given order. The URL scheme accepts at most nine waypoints, so a longer round is
 * split into consecutive legs, each starting where the previous one ended.
 * @param depot - Depot coordinates, start and end of the round
 * @param stops - Stops of the day, in visiting order
 * @returns One URL per leg, empty when there is no stop
 */
export const roundDirectionsUrls = (depot: GeoPoint, stops: MapsStop[]): string[] => {
  if (stops.length === 0) {
    return []
  }
  const depotLocation: string = `${depot.latitude},${depot.longitude}`
  const points: string[] = [depotLocation, ...stops.map(stopLocation), depotLocation]
  const urls: string[] = []
  for (let start: number = 0; start < points.length - 1; start += GOOGLE_MAPS_MAX_WAYPOINTS + 1) {
    const end: number = Math.min(start + GOOGLE_MAPS_MAX_WAYPOINTS + 1, points.length - 1)
    const params: URLSearchParams = new URLSearchParams({
      api: '1',
      origin: points[start] ?? depotLocation,
      destination: points[end] ?? depotLocation,
      travelmode: 'driving',
    })
    const waypoints: string[] = points.slice(start + 1, end)
    if (waypoints.length > 0) {
      params.set('waypoints', waypoints.join('|'))
    }
    urls.push(directionsUrlFrom(params))
  }
  return urls
}
