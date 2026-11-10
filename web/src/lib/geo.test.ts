import { describe, expect, it } from 'vitest'
import { angleDifference, bearingDeg, compassName, distanceKm, elevationAngleDeg, movePoint, nearestAngle } from './geo'

const home = { latitude: 43.25, longitude: -79.87 }

describe('distanceKm', () => {
  it('is zero for the same point', () => {
    expect(distanceKm(home, home)).toBe(0)
  })

  it('is about 111 km for one degree of latitude', () => {
    expect(distanceKm({ latitude: 43, longitude: -79.87 }, { latitude: 44, longitude: -79.87 })).toBeCloseTo(111.19, 1)
  })
})

describe('bearingDeg', () => {
  it('points north, east, south and west correctly', () => {
    expect(bearingDeg(home, { latitude: 43.5, longitude: -79.87 })).toBeCloseTo(0, 1)
    expect(bearingDeg(home, { latitude: 43.25, longitude: -79.5 })).toBeCloseTo(90, 0)
    expect(bearingDeg(home, { latitude: 43.0, longitude: -79.87 })).toBeCloseTo(180, 1)
    expect(bearingDeg(home, { latitude: 43.25, longitude: -80.2 })).toBeCloseTo(270, 0)
  })
})

describe('movePoint', () => {
  it('goes the right distance in the right direction', () => {
    const moved = movePoint(home, 45, 10)
    expect(distanceKm(home, moved)).toBeCloseTo(10, 6)
    expect(bearingDeg(home, moved)).toBeCloseTo(45, 1)
  })
})

describe('elevationAngleDeg', () => {
  it('is 45 degrees when the plane is as high as it is far away', () => {
    // 10 km away at 10 km high (32,808 ft), ignoring the small curve of the Earth at this range.
    expect(elevationAngleDeg(10, 32808, 0)).toBeCloseTo(45, 0)
  })

  it('is straight up when the plane is overhead', () => {
    expect(elevationAngleDeg(0, 35000, 100)).toBe(90)
  })

  it('is lower for far away planes because of the curve of the Earth', () => {
    const flat = (Math.atan2(35000 * 0.3048, 200_000) * 180) / Math.PI
    expect(elevationAngleDeg(200, 35000, 0)).toBeLessThan(flat)
  })
})

describe('compass helpers', () => {
  it('names the 8 directions', () => {
    expect(compassName(0)).toBe('north')
    expect(compassName(44)).toBe('north-east')
    expect(compassName(359)).toBe('north')
    expect(compassName(225)).toBe('south-west')
  })

  it('measures the short way between two directions', () => {
    expect(angleDifference(350, 10)).toBe(20)
    expect(angleDifference(90, 270)).toBe(180)
  })

  it('turns the short way round', () => {
    expect(nearestAngle(350, 10)).toBe(370)
    expect(nearestAngle(10, 350)).toBe(-10)
    expect(nearestAngle(720, 90)).toBe(810)
  })
})
