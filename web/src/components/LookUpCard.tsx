import { motion } from 'motion/react'
import type { LiveStatus } from '../hooks/useLivePlanes'
import {
  describePlane,
  describeWhereToLook,
  formatAltitude,
  formatClockTime,
  formatDistance,
  formatSpeed,
} from '../lib/describe'
import type { SkyPosition } from '../lib/lookUp'
import { Compass } from './Compass'
import { ElevationArc } from './ElevationArc'
import styles from './LookUpCard.module.css'

interface LookUpCardProps {
  target: SkyPosition | null
  isSelected: boolean
  status: LiveStatus
  lastPlaneSeenAt: Date | null
  reducedMotion: boolean
  onShowClosest: () => void
}

// Tells you where to look in the real sky to see a plane: the closest one, or the one you tapped.
export function LookUpCard({ target, isSelected, status, lastPlaneSeenAt, reducedMotion, onShowClosest }: LookUpCardProps) {
  return (
    <motion.section
      className={styles.card}
      aria-labelledby="look-up-title"
      initial={reducedMotion ? false : { opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className={styles.header}>
        <h2 id="look-up-title" className={styles.title}>
          {isSelected ? 'The plane you picked' : 'Look up'}
        </h2>
        {isSelected && (
          <button type="button" className={styles.textButton} onClick={onShowClosest}>
            Show closest
          </button>
        )}
      </header>

      {status === 'loading' && !target ? (
        <LoadingState />
      ) : target ? (
        // Keyed by plane, so switching planes fades the new one in instead of spinning the compass.
        <motion.div
          key={target.plane.icao24}
          initial={reducedMotion ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.35 }}
        >
          <PlaneView target={target} reducedMotion={reducedMotion} />
        </motion.div>
      ) : (
        <EmptyState lastPlaneSeenAt={lastPlaneSeenAt} />
      )}
    </motion.section>
  )
}

function PlaneView({ target, reducedMotion }: { target: SkyPosition; reducedMotion: boolean }) {
  const { plane } = target
  const whereToLook =
    target.elevation === null
      ? 'We know where it is, but not how high it is.'
      : describeWhereToLook(target.bearing, target.elevation)

  return (
    <>
      <div className={styles.visual}>
        <Compass bearing={target.bearing} reducedMotion={reducedMotion} />
        <ElevationArc elevation={target.elevation} reducedMotion={reducedMotion} />
      </div>

      <p className={styles.sentence}>{whereToLook}</p>
      <p className={styles.subject}>{describePlane(plane)}</p>

      <dl className={styles.facts}>
        <div>
          <dt>Flight</dt>
          <dd>{plane.callsign ?? plane.icao24.toUpperCase()}</dd>
        </div>
        <div>
          <dt>Altitude</dt>
          <dd>{formatAltitude(plane.altitudeFt)}</dd>
        </div>
        <div>
          <dt>Speed</dt>
          <dd>{formatSpeed(plane.speedKts)}</dd>
        </div>
        <div>
          <dt>Distance</dt>
          <dd>{formatDistance(target.distanceKm)}</dd>
        </div>
      </dl>
    </>
  )
}

function LoadingState() {
  return (
    <div className={styles.loading} aria-label="Loading planes">
      <div className={styles.visual}>
        <div className={`${styles.skeleton} ${styles.skeletonCircle}`} />
        <div className={`${styles.skeleton} ${styles.skeletonArc}`} />
      </div>
      <div className={`${styles.skeleton} ${styles.skeletonLine}`} />
      <div className={`${styles.skeleton} ${styles.skeletonLine} ${styles.skeletonShort}`} />
    </div>
  )
}

function EmptyState({ lastPlaneSeenAt }: { lastPlaneSeenAt: Date | null }) {
  return (
    <div className={styles.empty}>
      <p className={styles.sentence}>Quiet skies right now.</p>
      <p className={styles.subject}>
        My antenna can't hear any planes nearby.{' '}
        {lastPlaneSeenAt
          ? `The last one was here at ${formatClockTime(lastPlaneSeenAt)}.`
          : 'Check back in a few minutes.'}
      </p>
    </div>
  )
}
