import { describe, expect, it } from 'vitest'
import type { ReplayPoint } from '../api/types'
import { groupIntoTracks, planesAt, positionOnTrack } from './replay'
import { sunPosition } from './sun'

function point(icao24: string, time: string, latitude: number): ReplayPoint {
  return { icao24, callsign: 'ACA1', typeCode: null, time, latitude, longitude: -79.87, altitudeFt: 10000, speedKts: 250, heading: 0 }
}

describe('replay tracks', () => {
  // Points arrive out of order, as they would from two separate hourly requests.
  const tracks = groupIntoTracks([
    point('aaaaaa', '2026-11-09T20:00:20Z', 43.2),
    point('aaaaaa', '2026-11-09T20:00:00Z', 43.0),
    point('bbbbbb', '2026-11-09T20:10:00Z', 44.0),
  ])

  it('groups points by plane and sorts them by time', () => {
    expect(tracks.size).toBe(2)
    expect(tracks.get('aaaaaa')!.points.map((p) => p.latitude)).toEqual([43.0, 43.2])
  })

  it('blends between two sightings', () => {
    const middle = positionOnTrack(tracks.get('aaaaaa')!, Date.parse('2026-11-09T20:00:10Z'))
    expect(middle?.latitude).toBeCloseTo(43.1, 6)
  })

  it('works out the climb rate from the altitude change', () => {
    const climbing = groupIntoTracks([
      { ...point('cccccc', '2026-11-09T20:00:00Z', 43.0), altitudeFt: 10000 },
      { ...point('cccccc', '2026-11-09T20:00:30Z', 43.1), altitudeFt: 11000 },
    ])
    expect(positionOnTrack(climbing.get('cccccc')!, Date.parse('2026-11-09T20:00:10Z'))?.verticalRate).toBe(2000)
  })

  it('has no position before the first sighting or long after the last one', () => {
    const track = tracks.get('aaaaaa')!
    expect(positionOnTrack(track, Date.parse('2026-11-09T19:59:00Z'))).toBeNull()
    expect(positionOnTrack(track, Date.parse('2026-11-09T20:05:00Z'))).toBeNull()
  })

  it('lists the planes in the air at a moment', () => {
    const planes = planesAt(tracks, Date.parse('2026-11-09T20:00:10Z'))
    expect(planes.map((p) => p.icao24)).toEqual(['aaaaaa'])
  })
})

describe('sun position over Hamilton', () => {
  it('is about 30 degrees up at noon in November', () => {
    expect(sunPosition(new Date('2026-11-09T17:00:00Z'), 43.25, -79.87).elevation).toBeCloseTo(29.9, 0)
  })

  it('is at the horizon at sunset', () => {
    expect(Math.abs(sunPosition(new Date('2026-11-09T21:58:00Z'), 43.25, -79.87).elevation)).toBeLessThan(1)
  })

  it('is about 70 degrees up at noon on the longest day', () => {
    expect(sunPosition(new Date('2026-06-21T17:15:00Z'), 43.25, -79.87).elevation).toBeCloseTo(70.2, 0)
  })

  it('knows morning from evening', () => {
    expect(sunPosition(new Date('2026-11-09T12:30:00Z'), 43.25, -79.87).isMorning).toBe(true)
    expect(sunPosition(new Date('2026-11-09T21:30:00Z'), 43.25, -79.87).isMorning).toBe(false)
  })
})
