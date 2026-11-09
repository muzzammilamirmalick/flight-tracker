// Small geometry helpers for points on the Earth. Angles are in degrees.

export interface LatLon {
  latitude: number
  longitude: number
}

const EARTH_RADIUS_KM = 6371
const FEET_TO_METERS = 0.3048

const toRadians = (degrees: number) => (degrees * Math.PI) / 180
const toDegrees = (radians: number) => (radians * 180) / Math.PI

// Great circle distance (haversine formula).
export function distanceKm(from: LatLon, to: LatLon): number {
  const dLat = toRadians(to.latitude - from.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(from.latitude)) * Math.cos(toRadians(to.latitude)) * Math.sin(dLon / 2) ** 2
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Compass direction from one point to another, 0 = north, 90 = east.
export function bearingDeg(from: LatLon, to: LatLon): number {
  const lat1 = toRadians(from.latitude)
  const lat2 = toRadians(to.latitude)
  const dLon = toRadians(to.longitude - from.longitude)
  const y = Math.sin(dLon) * Math.cos(lat2)
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon)
  return (toDegrees(Math.atan2(y, x)) + 360) % 360
}

// The point you reach by travelling a distance in a direction.
export function movePoint(start: LatLon, headingDeg: number, km: number): LatLon {
  const angular = km / EARTH_RADIUS_KM
  const heading = toRadians(headingDeg)
  const lat1 = toRadians(start.latitude)
  const lon1 = toRadians(start.longitude)

  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(heading),
  )
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(heading) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    )

  return { latitude: toDegrees(lat2), longitude: toDegrees(lon2) }
}

// How high above the horizon a plane looks from the ground, in degrees.
// Takes the curve of the Earth into account, which matters for far away planes.
export function elevationAngleDeg(groundKm: number, altitudeFt: number, homeElevationM: number): number {
  const heightM = altitudeFt * FEET_TO_METERS - homeElevationM
  const groundM = groundKm * 1000
  if (groundM < 1) return 90

  const curveDropM = (groundM * groundM) / (2 * EARTH_RADIUS_KM * 1000)
  return toDegrees(Math.atan2(heightM - curveDropM, groundM))
}

const COMPASS_NAMES = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west']
const COMPASS_SHORT = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

export function compassName(bearing: number): string {
  return COMPASS_NAMES[Math.round(bearing / 45) % 8]
}

export function compassShort(bearing: number): string {
  return COMPASS_SHORT[Math.round(bearing / 45) % 8]
}

// Smallest difference between two directions, 0 to 180.
export function angleDifference(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360
  return diff > 180 ? 360 - diff : diff
}

// Picks the version of `next` (next, next + 360, next - 360...) closest to `previous`,
// so a rotation from 350 to 10 turns 20 degrees instead of spinning back 340.
export function nearestAngle(previous: number, next: number): number {
  let delta = (next - previous) % 360
  if (delta > 180) delta -= 360
  if (delta < -180) delta += 360
  return previous + delta
}
