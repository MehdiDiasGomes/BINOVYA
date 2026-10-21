import { describe, expect, it } from 'vitest'

import { GOOGLE_MAPS_MAX_WAYPOINTS } from '../../../app/constants/pro'
import { directionsUrl, roundDirectionsUrls } from '../../../app/utils/googleMaps'

import type { GeoPoint } from '../../../app/types/booking'
import type { MapsStop } from '../../../app/types/pro'

const DEPOT: GeoPoint = { latitude: 49.1193, longitude: 6.1757 }

const DEPOT_PARAM = '49.1193,6.1757'

const stop = (index: number): MapsStop => ({
  latitude: 49 + index / 100,
  longitude: 6 + index / 100,
  address: `${index} rue de Test, 57000 Metz`,
})

const stops = (count: number): MapsStop[] => Array.from({ length: count }, (_u, i) => stop(i + 1))

const params = (url: string): URLSearchParams => new URL(url).searchParams

const waypointsOf = (url: string): string[] => params(url).get('waypoints')?.split('|') ?? []

describe('directionsUrl', () => {
  it('targets the official directions endpoint in driving mode', () => {
    const url = new URL(directionsUrl(stop(1)))
    expect(`${url.origin}${url.pathname}`).toBe('https://www.google.com/maps/dir/')
    expect(url.searchParams.get('api')).toBe('1')
    expect(url.searchParams.get('travelmode')).toBe('driving')
  })

  it('uses the coordinates as destination', () => {
    expect(params(directionsUrl(stop(1))).get('destination')).toBe('49.01,6.01')
  })

  it('has no origin so Maps starts from the position of the phone', () => {
    expect(params(directionsUrl(stop(1))).has('origin')).toBe(false)
  })

  it('falls back to the trimmed address when a coordinate is not finite', () => {
    const url = directionsUrl({ latitude: Number.NaN, longitude: 6, address: '  1 rue X, Metz ' })
    expect(params(url).get('destination')).toBe('1 rue X, Metz')
  })

  it.each([
    ['latitude above 90', { latitude: 91, longitude: 6 }],
    ['latitude below -90', { latitude: -90.5, longitude: 6 }],
    ['longitude above 180', { latitude: 49, longitude: 181 }],
    ['infinite longitude', { latitude: 49, longitude: Number.POSITIVE_INFINITY }],
  ])('falls back to the address for %s', (_label, point) => {
    expect(params(directionsUrl({ ...point, address: '5 rue Y' })).get('destination')).toBe(
      '5 rue Y',
    )
  })

  it('keeps coordinates at the exact bounds', () => {
    const url = directionsUrl({ latitude: 90, longitude: -180, address: 'pole' })
    expect(params(url).get('destination')).toBe('90,-180')
  })

  it('encodes an address with special characters', () => {
    const url = directionsUrl({ latitude: 200, longitude: 0, address: 'Rue A & B | 57000' })
    expect(params(url).get('destination')).toBe('Rue A & B | 57000')
  })
})

describe('roundDirectionsUrls', () => {
  it('returns no link without stop', () => {
    expect(roundDirectionsUrls(DEPOT, [])).toEqual([])
  })

  it('builds one leg from the depot back to the depot for one stop', () => {
    const [url, ...others] = roundDirectionsUrls(DEPOT, stops(1))
    expect(others).toEqual([])
    expect(params(url ?? '').get('origin')).toBe(DEPOT_PARAM)
    expect(params(url ?? '').get('destination')).toBe(DEPOT_PARAM)
    expect(waypointsOf(url ?? '')).toEqual(['49.01,6.01'])
  })

  it('keeps nine stops in a single leg, in the given order', () => {
    const urls = roundDirectionsUrls(DEPOT, stops(GOOGLE_MAPS_MAX_WAYPOINTS))
    expect(urls).toHaveLength(1)
    expect(waypointsOf(urls[0] ?? '')).toEqual(stops(9).map(s => `${s.latitude},${s.longitude}`))
  })

  it('splits ten stops in two legs chained on the same point', () => {
    const urls = roundDirectionsUrls(DEPOT, stops(10))
    expect(urls).toHaveLength(2)
    expect(waypointsOf(urls[0] ?? '')).toHaveLength(GOOGLE_MAPS_MAX_WAYPOINTS)
    expect(params(urls[1] ?? '').get('origin')).toBe(params(urls[0] ?? '').get('destination'))
    expect(params(urls[1] ?? '').get('destination')).toBe(DEPOT_PARAM)
  })

  it('keeps nineteen stops in two full legs, the ninth stop being the change of leg', () => {
    const urls = roundDirectionsUrls(DEPOT, stops(19))
    expect(urls).toHaveLength(2)
    for (const url of urls) {
      expect(waypointsOf(url)).toHaveLength(GOOGLE_MAPS_MAX_WAYPOINTS)
    }
    expect(params(urls[0] ?? '').get('origin')).toBe(DEPOT_PARAM)
    expect(params(urls[1] ?? '').get('destination')).toBe(DEPOT_PARAM)
  })

  it('needs a third leg from twenty stops, none above nine waypoints', () => {
    const urls = roundDirectionsUrls(DEPOT, stops(20))
    expect(urls).toHaveLength(3)
    for (const url of urls) {
      expect(waypointsOf(url).length).toBeLessThanOrEqual(GOOGLE_MAPS_MAX_WAYPOINTS)
    }
  })

  it('visits every stop exactly once across the legs', () => {
    const urls = roundDirectionsUrls(DEPOT, stops(19))
    const visited = urls.flatMap(url => [
      ...waypointsOf(url),
      ...(url === urls.at(-1) ? [] : [params(url).get('destination') ?? '']),
    ])
    expect(visited).toEqual(stops(19).map(s => `${s.latitude},${s.longitude}`))
  })

  it('uses the address of a stop whose coordinates are invalid', () => {
    const bad: MapsStop = { latitude: 999, longitude: 6, address: ' 3 rue Z, Metz ' }
    const [url] = roundDirectionsUrls(DEPOT, [bad])
    expect(waypointsOf(url ?? '')).toEqual(['3 rue Z, Metz'])
  })
})
