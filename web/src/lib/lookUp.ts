import type { LivePlane } from '../api/types'
import { HOME } from '../config'
import { bearingDeg, distanceKm, elevationAngleDeg, type LatLon } from './geo'
import { predictPosition } from './planeMotion'

// Where a plane is in the real sky, seen from my home.
export interface SkyPosition {
  plane: LivePlane
  position: LatLon
  distanceKm: number
  // Compass direction to look in, 0 = north.
  bearing: number
  // Degrees above the horizon. Null if we do not know the altitude.
  elevation: number | null
}

export function skyPositionOf(plane: LivePlane, nowMs: number): SkyPosition {
  const position = predictPosition(plane, nowMs)
  const km = distanceKm(HOME, position)
  return {
    plane,
    position,
    distanceKm: km,
    bearing: bearingDeg(HOME, position),
    elevation: plane.altitudeFt === null ? null : elevationAngleDeg(km, plane.altitudeFt, HOME.elevationMeters),
  }
}

// Another plane has to be this much closer before the Look Up card switches to it.
// Without this the card flips back and forth when two planes are about the same distance away.
const SWITCH_MARGIN_KM = 1.5

export function closestPlane(planes: LivePlane[], nowMs: number, currentIcao: string | null = null): SkyPosition | null {
  let closest: SkyPosition | null = null
  let current: SkyPosition | null = null

  for (const plane of planes) {
    const sky = skyPositionOf(plane, nowMs)
    if (!closest || sky.distanceKm < closest.distanceKm) closest = sky
    if (plane.icao24 === currentIcao) current = sky
  }

  if (current && closest && current.distanceKm - closest.distanceKm < SWITCH_MARGIN_KM) {
    return current
  }
  return closest
}
