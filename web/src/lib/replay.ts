import type { LivePlane, ReplayPoint } from '../api/types'
import type { TrailLinePoint } from './planeMotion'

// One plane's sightings for the replay, oldest first.
export interface TrackPoint {
  timeMs: number
  latitude: number
  longitude: number
  altitudeFt: number | null
  speedKts: number | null
  heading: number | null
}

export interface Track {
  icao24: string
  callsign: string | null
  typeCode: string | null
  points: TrackPoint[]
}

// If there is a gap longer than this between two sightings, the plane is not shown in between.
const MAX_GAP_MS = 90_000

export function groupIntoTracks(points: ReplayPoint[]): Map<string, Track> {
  const tracks = new Map<string, Track>()

  for (const point of points) {
    let track = tracks.get(point.icao24)
    if (!track) {
      track = { icao24: point.icao24, callsign: point.callsign, typeCode: point.typeCode, points: [] }
      tracks.set(point.icao24, track)
    }
    track.points.push({
      timeMs: Date.parse(point.time),
      latitude: point.latitude,
      longitude: point.longitude,
      altitudeFt: point.altitudeFt,
      speedKts: point.speedKts,
      heading: point.heading,
    })
  }

  // Points can come from different hourly requests, so sort each track once at the end.
  for (const track of tracks.values()) {
    track.points.sort((a, b) => a.timeMs - b.timeMs)
  }
  return tracks
}

// Index of the last point at or before `timeMs`, or -1 if the track starts later.
function lastPointBefore(points: TrackPoint[], timeMs: number): number {
  let low = 0
  let high = points.length - 1
  let found = -1
  while (low <= high) {
    const middle = (low + high) >> 1
    if (points[middle].timeMs <= timeMs) {
      found = middle
      low = middle + 1
    } else {
      high = middle - 1
    }
  }
  return found
}

// Where a plane was at `timeMs`, blending between the two sightings around that moment.
// Null if we did not have the plane at that time.
export function positionOnTrack(track: Track, timeMs: number): (TrackPoint & { verticalRate: number | null }) | null {
  const index = lastPointBefore(track.points, timeMs)
  if (index === -1) return null

  const before = track.points[index]
  if (timeMs - before.timeMs > MAX_GAP_MS) return null

  const after = track.points[index + 1]
  if (!after || after.timeMs - before.timeMs > MAX_GAP_MS) return { ...before, timeMs, verticalRate: null }

  // Feet per minute, from the altitude change between the two sightings.
  const minutes = (after.timeMs - before.timeMs) / 60_000
  const verticalRate =
    before.altitudeFt !== null && after.altitudeFt !== null && minutes > 0
      ? Math.round((after.altitudeFt - before.altitudeFt) / minutes)
      : null

  const amount = (timeMs - before.timeMs) / (after.timeMs - before.timeMs)
  const blend = (a: number, b: number) => a + (b - a) * amount
  return {
    timeMs,
    latitude: blend(before.latitude, after.latitude),
    longitude: blend(before.longitude, after.longitude),
    altitudeFt: before.altitudeFt !== null && after.altitudeFt !== null ? Math.round(blend(before.altitudeFt, after.altitudeFt)) : before.altitudeFt,
    speedKts: before.speedKts,
    heading: before.heading,
    verticalRate,
  }
}

// The planes in the air at `timeMs`, shaped like live planes so the map, board and cards can show them.
export function planesAt(tracks: Map<string, Track>, timeMs: number): LivePlane[] {
  const planes: LivePlane[] = []
  for (const track of tracks.values()) {
    const point = positionOnTrack(track, timeMs)
    if (!point) continue
    planes.push({
      icao24: track.icao24,
      callsign: track.callsign,
      registration: null,
      typeCode: track.typeCode,
      manufacturer: null,
      model: null,
      operator: null,
      latitude: point.latitude,
      longitude: point.longitude,
      altitudeFt: point.altitudeFt,
      speedKts: point.speedKts,
      heading: point.heading,
      verticalRate: point.verticalRate,
      lastSeen: new Date(timeMs).toISOString(),
      route: null,
    })
  }
  return planes
}

// Trail lines for the replay. Trail ages are measured in replay time, then shifted onto the real clock
// (`nowMs`) because that is the clock the trail layer uses to fade lines out.
export function replayTrailLines(
  tracks: Map<string, Track>,
  replayTimeMs: number,
  nowMs: number,
  trailMs: number,
): TrailLinePoint[][] {
  const lines: TrailLinePoint[][] = []
  for (const track of tracks.values()) {
    const current = positionOnTrack(track, replayTimeMs)
    if (!current) continue

    const line = track.points
      .filter((p) => p.timeMs <= replayTimeMs && p.timeMs >= replayTimeMs - trailMs)
      .map((p) => ({ latitude: p.latitude, longitude: p.longitude, altitudeFt: p.altitudeFt, timeMs: nowMs - (replayTimeMs - p.timeMs) }))
    line.push({ latitude: current.latitude, longitude: current.longitude, altitudeFt: current.altitudeFt, timeMs: nowMs })
    lines.push(line)
  }
  return lines
}
