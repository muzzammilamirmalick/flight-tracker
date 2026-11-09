import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchReplay } from '../api/client'
import type { LivePlane, ReplayPoint } from '../api/types'
import type { LatLon } from '../lib/geo'
import { predictPosition, type TrailLinePoint } from '../lib/planeMotion'
import { groupIntoTracks, planesAt, positionOnTrack, replayTrailLines, type Track } from '../lib/replay'

export type ReplaySpeed = 1 | 10 | 60

const HOUR_MS = 3_600_000
// The React state for the slider and planes updates this often. The map moves every frame.
const UI_UPDATE_MS = 250

function startOfToday(): number {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date.valueOf()
}

function hourStart(timeMs: number): number {
  return Math.floor(timeMs / HOUR_MS) * HOUR_MS
}

export interface Replay {
  active: boolean
  playing: boolean
  speed: ReplaySpeed
  timeMs: number
  dayStartMs: number
  loading: boolean
  planes: LivePlane[]
  start: () => void
  stop: () => void
  togglePlay: () => void
  setSpeed: (speed: ReplaySpeed) => void
  seek: (timeMs: number) => void
  positionAt: (plane: LivePlane, nowMs: number) => LatLon
  getTrailLines: (nowMs: number) => TrailLinePoint[][]
}

// Plays today's traffic back on the map. Loads sightings an hour at a time around the replay time.
export function useReplay(trailMs: number): Replay {
  const [active, setActive] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState<ReplaySpeed>(10)
  const [timeMs, setTimeMs] = useState(0)
  const [dayStartMs, setDayStartMs] = useState(0)
  const [hours, setHours] = useState<Map<number, ReplayPoint[]>>(new Map())
  const [loadingCount, setLoadingCount] = useState(0)

  // The exact replay time, moved every frame. timeMs (state) follows it a few times a second.
  const timeRef = useRef(0)
  const requested = useRef(new Set<number>())

  const tracks = useMemo(() => groupIntoTracks([...hours.values()].flat()), [hours])
  const tracksRef = useRef<Map<string, Track>>(tracks)
  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  // Load the hour we are in, plus the one before (for trails) and the one after (so playback does not wait).
  const currentHour = hourStart(timeMs)
  useEffect(() => {
    if (!active) return
    for (const start of [currentHour - HOUR_MS, currentHour, currentHour + HOUR_MS]) {
      if (start < hourStart(dayStartMs) || start > Date.now() || requested.current.has(start)) continue
      requested.current.add(start)
      setLoadingCount((count) => count + 1)

      fetchReplay(start, start + HOUR_MS)
        .then((points) => setHours((previous) => new Map(previous).set(start, points)))
        .catch(() => requested.current.delete(start)) // try again next time
        .finally(() => setLoadingCount((count) => count - 1))
    }
  }, [active, currentHour, dayStartMs])

  // Move the replay clock while playing. Stops when it catches up with now.
  useEffect(() => {
    if (!active || !playing) return
    let frame = 0
    let last = performance.now()
    let lastUiUpdate = 0

    function tick(now: number) {
      timeRef.current += (now - last) * speed
      last = now

      const reachedNow = timeRef.current >= Date.now()
      if (reachedNow) timeRef.current = Date.now()

      if (reachedNow || now - lastUiUpdate > UI_UPDATE_MS) {
        lastUiUpdate = now
        setTimeMs(timeRef.current)
      }

      if (reachedNow) {
        setPlaying(false)
      } else {
        frame = requestAnimationFrame(tick)
      }
    }

    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [active, playing, speed])

  const start = useCallback(() => {
    const dayStart = startOfToday()
    // Start an hour ago (or at midnight, if it is not 1 AM yet) so there is something to see.
    const startTime = Math.max(dayStart, Date.now() - HOUR_MS)
    timeRef.current = startTime
    requested.current.clear()
    setHours(new Map())
    setDayStartMs(dayStart)
    setTimeMs(startTime)
    setActive(true)
    setPlaying(true)
  }, [])

  const stop = useCallback(() => {
    setActive(false)
    setPlaying(false)
  }, [])

  const seek = useCallback((time: number) => {
    timeRef.current = time
    setTimeMs(time)
  }, [])

  const togglePlay = useCallback(() => {
    // Pressing play at the live edge starts again from an hour back.
    if (timeRef.current >= Date.now() - 1000) {
      timeRef.current = Math.max(startOfToday(), Date.now() - HOUR_MS)
      setTimeMs(timeRef.current)
    }
    setPlaying((value) => !value)
  }, [])

  const planes = useMemo(() => (active ? planesAt(tracks, timeMs) : []), [active, tracks, timeMs])

  // Markers ask this every frame, so it reads the exact clock instead of the slower React state.
  const positionAt = useCallback((plane: LivePlane, nowMs: number): LatLon => {
    const track = tracksRef.current.get(plane.icao24)
    const point = track ? positionOnTrack(track, timeRef.current) : null
    return point ?? predictPosition(plane, nowMs)
  }, [])

  const getTrailLines = useCallback(
    (nowMs: number) => replayTrailLines(tracksRef.current, timeRef.current, nowMs, trailMs),
    [trailMs],
  )

  return {
    active,
    playing,
    speed,
    timeMs,
    dayStartMs,
    loading: loadingCount > 0,
    planes,
    start,
    stop,
    togglePlay,
    setSpeed,
    seek,
    positionAt,
    getTrailLines,
  }
}
