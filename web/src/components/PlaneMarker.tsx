import { useEffect, useMemo, useRef, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { Marker, type Map as MapLibreMap } from 'maplibre-gl'
import { motion, usePresence } from 'motion/react'
import type { LivePlane } from '../api/types'
import { altitudeColor } from '../lib/altitudeColor'
import { airlineName, formatAltitude } from '../lib/describe'
import { useContinuousAngle } from '../hooks/useContinuousAngle'
import type { LatLon } from '../lib/geo'
import { predictPosition } from '../lib/planeMotion'
import styles from './PlaneMarker.module.css'

interface PlaneMarkerProps {
  map: MapLibreMap
  plane: LivePlane
  isSelected: boolean
  reducedMotion: boolean
  onSelect: (icao24: string) => void
}

// When a new report arrives, the marker eases from where it is drawn into the new path
// over this long, so it never jumps.
const BLEND_MS = 1500

export function PlaneMarker({ map, plane, isSelected, reducedMotion, onSelect }: PlaneMarkerProps) {
  const element = useMemo(() => document.createElement('div'), [])
  const markerRef = useRef<Marker | null>(null)
  const planeRef = useRef(plane)
  const drawnAt = useRef<LatLon | null>(null)
  const correction = useRef({ latitude: 0, longitude: 0, startedAt: 0 })
  const rotation = useContinuousAngle(plane.heading)
  const [isPresent, safeToRemove] = usePresence()

  // Add the marker to the map once, and remove it when this component goes away.
  useEffect(() => {
    const start = planeRef.current
    const marker = new Marker({ element, anchor: 'center' })
      .setLngLat([start.longitude, start.latitude])
      .addTo(map)
    markerRef.current = marker
    return () => {
      marker.remove()
      markerRef.current = null
    }
  }, [map, element])

  // A new report: remember how far the drawn position is from the new guess, then fade that gap out.
  useEffect(() => {
    planeRef.current = plane
    const now = Date.now()
    const drawn = drawnAt.current
    if (reducedMotion || !drawn) {
      correction.current = { latitude: 0, longitude: 0, startedAt: now }
      return
    }
    const guess = predictPosition(plane, now)
    correction.current = {
      latitude: drawn.latitude - guess.latitude,
      longitude: drawn.longitude - guess.longitude,
      startedAt: now,
    }
  }, [plane, reducedMotion])

  // Move the marker every frame. With reduced motion it only moves when a report arrives.
  useEffect(() => {
    let frame = 0

    function draw() {
      const now = Date.now()
      const current = planeRef.current
      let position: LatLon

      if (reducedMotion) {
        position = { latitude: current.latitude, longitude: current.longitude }
      } else {
        const guess = predictPosition(current, now)
        const remaining = Math.max(0, 1 - (now - correction.current.startedAt) / BLEND_MS)
        const ease = remaining * remaining
        position = {
          latitude: guess.latitude + correction.current.latitude * ease,
          longitude: guess.longitude + correction.current.longitude * ease,
        }
        frame = requestAnimationFrame(draw)
      }

      drawnAt.current = position
      markerRef.current?.setLngLat([position.longitude, position.latitude])
    }

    draw()
    return () => cancelAnimationFrame(frame)
  }, [plane, reducedMotion])

  // With reduced motion there is no fade out, so remove the marker straight away.
  useEffect(() => {
    if (!isPresent && reducedMotion) safeToRemove?.()
  }, [isPresent, reducedMotion, safeToRemove])

  function handleClick() {
    onSelect(plane.icao24)
    const target = drawnAt.current ?? plane
    const camera = { center: [target.longitude, target.latitude] as [number, number], zoom: Math.max(map.getZoom(), 10) }
    if (reducedMotion) {
      map.jumpTo(camera)
    } else {
      map.flyTo({ ...camera, duration: 1400 })
    }
  }

  const name = plane.callsign ?? plane.icao24.toUpperCase()
  const airline = airlineName(plane)
  const altitude = plane.altitudeFt === null ? 'altitude unknown' : `altitude ${formatAltitude(plane.altitudeFt)}`
  const label = `${name}${airline ? `, ${airline}` : ''}, ${altitude}. Show where to look.`

  return createPortal(
    <motion.button
      type="button"
      className={`${styles.plane} ${isSelected ? styles.selected : ''}`}
      style={{ '--plane-color': altitudeColor(plane.altitudeFt) } as CSSProperties}
      aria-label={label}
      aria-pressed={isSelected}
      onClick={handleClick}
      initial={reducedMotion ? false : { opacity: 0, scale: 0.4 }}
      animate={isPresent ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.4 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      onAnimationComplete={() => {
        if (!isPresent) safeToRemove?.()
      }}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 32 32"
        style={{ transform: `rotate(${rotation}deg)` }}
        aria-hidden="true"
      >
        <path d="M16 2.5c1.1 0 1.8 1.2 1.8 2.8v7l10.2 5.6v2.6l-10.2-3v6.2l3 2.3v2l-4.8-1.3-4.8 1.3v-2l3-2.3v-6.2l-10.2 3v-2.6l10.2-5.6v-7c0-1.6.7-2.8 1.8-2.8z" />
      </svg>
      <span className={styles.callsign}>{name}</span>
    </motion.button>,
    element,
  )
}
