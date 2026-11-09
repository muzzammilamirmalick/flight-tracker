import { motion } from 'motion/react'
import styles from './LookUpCard.module.css'

interface ElevationArcProps {
  elevation: number | null
  reducedMotion: boolean
}

// A quarter circle from the horizon (0 degrees) to straight up (90 degrees),
// with a dot showing how high to look.
const CENTER_X = 12
const CENTER_Y = 64
const RADIUS = 54

export function ElevationArc({ elevation, reducedMotion }: ElevationArcProps) {
  const degrees = elevation === null ? 0 : Math.min(Math.max(elevation, 0), 90)
  const radians = (degrees * Math.PI) / 180
  const dotX = CENTER_X + RADIUS * Math.cos(radians)
  const dotY = CENTER_Y - RADIUS * Math.sin(radians)
  const transition = reducedMotion ? { duration: 0 } : { type: 'spring' as const, stiffness: 120, damping: 20 }

  return (
    <div
      className={styles.elevation}
      role="img"
      aria-label={elevation === null ? 'Height in the sky unknown' : `${Math.round(degrees)} degrees above the horizon`}
    >
      <svg viewBox="0 0 80 72" aria-hidden="true">
        <path
          d={`M ${CENTER_X + RADIUS} ${CENTER_Y} A ${RADIUS} ${RADIUS} 0 0 0 ${CENTER_X} ${CENTER_Y - RADIUS}`}
          className={styles.arc}
        />
        <line x1="4" y1={CENTER_Y} x2="76" y2={CENTER_Y} className={styles.horizon} />
        {elevation !== null && (
          <>
            <motion.line
              x1={CENTER_X}
              y1={CENTER_Y}
              initial={false}
              animate={{ x2: dotX, y2: dotY }}
              transition={transition}
              className={styles.sightLine}
            />
            <motion.circle r="4.5" initial={false} animate={{ cx: dotX, cy: dotY }} transition={transition} className={styles.sightDot} />
          </>
        )}
      </svg>
      <span className={styles.elevationValue}>{elevation === null ? '?' : `${Math.round(degrees)}°`}</span>
      <span className={styles.elevationLabel}>above the horizon</span>
    </div>
  )
}
