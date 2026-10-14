import type { GeoPoint } from '@/types/booking'

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
