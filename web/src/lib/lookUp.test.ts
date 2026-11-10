import { describe, expect, it } from 'vitest'
import type { LivePlane } from '../api/types'
import { describePlane, describeRoute, describeWhereToLook } from './describe'
import { closestPlane, skyPositionOf } from './lookUp'

const NOW = Date.parse('2026-11-09T20:00:00Z')

function plane(overrides: Partial<LivePlane>): LivePlane {
  return {
    icao24: 'c07c7b',
    callsign: 'ACA123',
    registration: null,
    typeCode: 'B38M',
    manufacturer: 'Boeing',
    model: '737-8',
    operator: null,
    latitude: 43.3,
    longitude: -79.87,
    altitudeFt: 30000,
    speedKts: null,
    heading: null,
    verticalRate: 0,
    lastSeen: new Date(NOW).toISOString(),
    route: null,
    ...overrides,
  }
}

describe('skyPositionOf', () => {
  it('says where to look for a plane north of home', () => {
    const sky = skyPositionOf(plane({ latitude: 43.3 }), NOW)

    expect(sky.bearing).toBeCloseTo(0, 0)
    expect(sky.distanceKm).toBeCloseTo(5.56, 1)
    // 30,000 ft is about 9.1 km up, so about 58 degrees above the horizon at 5.6 km away.
    expect(sky.elevation).toBeGreaterThan(55)
    expect(sky.elevation).toBeLessThan(61)
  })

  it('has no elevation when the altitude is unknown', () => {
    expect(skyPositionOf(plane({ altitudeFt: null }), NOW).elevation).toBeNull()
  })
})

describe('closestPlane', () => {
  const near = plane({ icao24: 'aaaaaa', latitude: 43.3 })
  const far = plane({ icao24: 'bbbbbb', latitude: 43.6 })

  it('picks the nearest plane', () => {
    expect(closestPlane([far, near], NOW)?.plane.icao24).toBe('aaaaaa')
  })

  it('is null when there are no planes', () => {
    expect(closestPlane([], NOW)).toBeNull()
  })

  it('keeps the current plane unless another one is clearly closer', () => {
    const current = plane({ icao24: 'cccccc', latitude: 43.305 }) // about 0.6 km further than `near`
    expect(closestPlane([near, current], NOW, 'cccccc')?.plane.icao24).toBe('cccccc')
    expect(closestPlane([near, far], NOW, 'bbbbbb')?.plane.icao24).toBe('aaaaaa')
  })
})

describe('plain words', () => {
  it('describes where to look', () => {
    expect(describeWhereToLook(45, 30.4)).toBe('Look north-east, about 30 degrees up.')
    expect(describeWhereToLook(180, 1)).toBe('Look south, just above the horizon.')
    expect(describeWhereToLook(0, 80)).toBe('Look almost straight up.')
  })

  it('names the airline from the callsign and the aircraft', () => {
    expect(describePlane(plane({}))).toBe('Air Canada Boeing 737-8.')
  })

  it('only trusts a route that matches where the plane is going', () => {
    const toMontreal = {
      airlineName: null,
      origin: { code: 'YYZ', name: null, city: 'Toronto', latitude: 43.68, longitude: -79.63 },
      destination: { code: 'YUL', name: null, city: 'Montreal', latitude: 45.47, longitude: -73.74 },
    }
    const headingEast = plane({ latitude: 43.8, longitude: -79.0, heading: 60, route: toMontreal })
    const headingWest = plane({ latitude: 43.8, longitude: -79.0, heading: 260, route: toMontreal })

    expect(describeRoute(headingEast)).toBe('Toronto to Montreal')
    expect(describePlane(headingEast)).toBe('Air Canada Boeing 737-8 heading to Montreal.')
    expect(describeRoute(headingWest)).toBeNull()
  })
})
