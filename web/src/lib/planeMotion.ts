import type { LivePlane } from '../api/types'
import { movePoint, type LatLon } from './geo'

// We only guess where a plane is for this long after its last report.
// After that it stays put until new data arrives.
const MAX_GUESS_SECONDS = 60
const KNOTS_TO_KM_PER_SECOND = 1.852 / 3600

// Where we think the plane is right now, based on its last report, speed and heading.
export function predictPosition(plane: LivePlane, nowMs: number): LatLon {
  const reported = { latitude: plane.latitude, longitude: plane.longitude }
  if (plane.speedKts === null || plane.heading === null) return reported

  const seconds = (nowMs - Date.parse(plane.lastSeen)) / 1000
  const clamped = Math.min(Math.max(seconds, 0), MAX_GUESS_SECONDS)
  return movePoint(reported, plane.heading, plane.speedKts * KNOTS_TO_KM_PER_SECOND * clamped)
}
