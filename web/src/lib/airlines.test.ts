import { describe, expect, it } from 'vitest'
import type { LivePlane } from '../api/types'
import { airlineCode, airlineFromCallsign, airlineFromCode } from './airlines'
import { airlineName, describePlane } from './describe'

describe('airline lookup', () => {
  it('reads the ICAO code from an airline callsign', () => {
    expect(airlineCode('ROU1676')).toBe('ROU')
    expect(airlineCode('wja4')).toBe('WJA')
    expect(airlineCode('CGABC')).toBeNull()
    expect(airlineCode(null)).toBeNull()
  })

  it('knows the Canadian airlines', () => {
    expect(airlineFromCallsign('ROU1676')).toBe('Air Canada Rouge')
    expect(airlineFromCallsign('ACA123')).toBe('Air Canada')
    expect(airlineFromCallsign('WJA45')).toBe('WestJet')
    expect(airlineFromCallsign('POE794')).toBe('Porter')
    expect(airlineFromCallsign('JZA923')).toBe('Jazz')
    expect(airlineFromCallsign('SWG300')).toBe('Sunwing')
    expect(airlineFromCallsign('FLE501')).toBe('Flair')
  })

  it('knows the big US airlines', () => {
    expect(airlineFromCode('DAL')).toBe('Delta')
    expect(airlineFromCode('aal')).toBe('American Airlines')
    expect(airlineFromCode('UAL')).toBe('United')
  })

  it('returns null for codes it does not know', () => {
    expect(airlineFromCallsign('XYZ123')).toBeNull()
    expect(airlineFromCode('XYZ')).toBeNull()
  })
})

describe('airline name for a plane', () => {
  const base: LivePlane = {
    icao24: 'c07c7b',
    callsign: 'ROU1676',
    registration: null,
    typeCode: null,
    manufacturer: null,
    model: null,
    operator: 'Air Canada',
    latitude: 43.3,
    longitude: -79.87,
    altitudeFt: 30000,
    speedKts: null,
    heading: null,
    verticalRate: null,
    lastSeen: '2026-11-09T20:00:00Z',
    route: { airlineName: 'Transportes Aereos I.R. Crusoe', origin: null, destination: null },
  }

  it('uses the callsign table before the registered owner and the route data', () => {
    expect(airlineName(base)).toBe('Air Canada Rouge')
  })

  it('falls back to the registered owner for unknown callsigns', () => {
    expect(airlineName({ ...base, callsign: 'N700RH', operator: 'Some Company' })).toBe('Some Company')
  })

  it('shows just the callsign when it is not sure', () => {
    expect(describePlane({ ...base, callsign: 'XYZ123', operator: null })).toBe('Flight XYZ123.')
  })
})
