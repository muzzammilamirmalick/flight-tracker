import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import {
  aircraftName,
  airlineName,
  describePlane,
  describeRoute,
  describeVerticalRate,
  formatAltitude,
  formatDistance,
  formatHeading,
  formatKnots,
  formatSecondsAgo,
  formatSpeed,
} from '../lib/describe'
import type { SkyPosition } from '../lib/lookUp'
import styles from './PlaneDetailCard.module.css'

interface PlaneDetailCardProps {
  target: SkyPosition
  nowMs: number
  reducedMotion: boolean
  onClose: () => void
}

// Everything we know about the plane you tapped, in plain words. Slides up from the bottom.
export function PlaneDetailCard({ target, nowMs, reducedMotion, onClose }: PlaneDetailCardProps) {
  const { plane } = target
  const headingRef = useRef<HTMLHeadingElement>(null)

  // Move keyboard focus to the card when it opens, and close it with Escape.
  useEffect(() => {
    headingRef.current?.focus()
  }, [plane.icao24])

  useEffect(() => {
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  const name = plane.callsign ?? plane.icao24.toUpperCase()
  const aircraft = aircraftName(plane)
  const route = describeRoute(plane)
  const secondsAgo = Math.max(0, (nowMs - Date.parse(plane.lastSeen)) / 1000)

  const rows: [string, string][] = [
    ['Airline', airlineName(plane) ?? 'Not sure'],
    ['Aircraft', aircraft ? `${aircraft}${plane.typeCode ? ` (${plane.typeCode})` : ''}` : (plane.typeCode ?? 'Unknown')],
    ['Altitude', formatAltitude(plane.altitudeFt)],
    ['Going', describeVerticalRate(plane.verticalRate)],
    ['Speed', `${formatSpeed(plane.speedKts)}${plane.speedKts === null ? '' : `, ${formatKnots(plane.speedKts)}`}`],
    ['Distance from home', formatDistance(target.distanceKm)],
    ['Flying towards', formatHeading(plane.heading)],
  ]
  if (route) rows.push(['Route', route])
  if (plane.registration) rows.push(['Registration', plane.registration])
  rows.push(['Last update', formatSecondsAgo(secondsAgo)])

  return (
    <motion.section
      className={styles.card}
      aria-labelledby="plane-detail-title"
      initial={reducedMotion ? false : { opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reducedMotion ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, y: 40 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.header}>
        <div>
          <h2 id="plane-detail-title" ref={headingRef} tabIndex={-1} className={styles.callsign}>
            {name}
          </h2>
          <p className={styles.summary}>{describePlane(plane)}</p>
        </div>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close plane details">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      </header>

      <dl className={styles.rows}>
        {rows.map(([label, value]) => (
          <div key={label} className={styles.row}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </motion.section>
  )
}
