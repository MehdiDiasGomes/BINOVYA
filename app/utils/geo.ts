import type { GeoPoint } from '@/types/booking'
import type { MapsStop } from '@/types/pro'

const EARTH_RADIUS_KM = 6371

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180

/**
 * Computes the straight-line distance between two points with the haversine formula.
 * @param from - Starting point
 * @param to - Destination point
 * @returns Distance in kilometres
 */
export const distanceInKm = (from: GeoPoint, to: GeoPoint): number => {
  const latitudeDelta: number = toRadians(to.latitude - from.latitude)
  const longitudeDelta: number = toRadians(to.longitude - from.longitude)
  const a: number =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) *
      Math.cos(toRadians(to.latitude)) *
      Math.sin(longitudeDelta / 2) ** 2
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a))
}

/**
 * Tells whether a point has usable coordinates: finite, latitude within ±90, longitude within ±180.
 * @param point - Point to check
 * @returns True when the coordinates can be put in a maps link
 */
export const hasValidCoordinates = (point: GeoPoint): boolean =>
  Number.isFinite(point.latitude) &&
  Number.isFinite(point.longitude) &&
  Math.abs(point.latitude) <= 90 &&
  Math.abs(point.longitude) <= 180

/**
 * Formats the destination of a maps link: `latitude,longitude` when the coordinates are valid,
 * the trimmed address otherwise.
 * @param stop - Coordinates and address text of the destination
 * @returns Location text, not URL-encoded
 */
export const stopLocation = (stop: MapsStop): string =>
  hasValidCoordinates(stop) ? `${stop.latitude},${stop.longitude}` : stop.address.trim()
