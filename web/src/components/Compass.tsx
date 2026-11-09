import { motion } from 'motion/react'
import { useContinuousAngle } from '../hooks/useContinuousAngle'
import { compassShort } from '../lib/geo'
import styles from './LookUpCard.module.css'

interface CompassProps {
  bearing: number
  reducedMotion: boolean
}

// A small compass with a needle pointing where to look.
export function Compass({ bearing, reducedMotion }: CompassProps) {
  // Keep the needle angle continuous so it turns the short way round.
  const angle = useContinuousAngle(bearing)

  return (
    <div className={styles.compass} role="img" aria-label={`Direction: ${compassShort(bearing)}`}>
      <svg viewBox="0 0 100 100" className={styles.compassFace} aria-hidden="true">
        <circle cx="50" cy="50" r="46" className={styles.compassRing} />
        {Array.from({ length: 16 }, (_, i) => (
          <line
            key={i}
            x1="50"
            y1={i % 4 === 0 ? 8 : 10}
            x2="50"
            y2="14"
            className={styles.compassTick}
            transform={`rotate(${i * 22.5} 50 50)`}
          />
        ))}
        <text x="50" y="26" className={styles.compassLetter}>N</text>
        <text x="78" y="54" className={styles.compassLetter}>E</text>
        <text x="50" y="82" className={styles.compassLetter}>S</text>
        <text x="22" y="54" className={styles.compassLetter}>W</text>
      </svg>

      <motion.div
        className={styles.needle}
        initial={false}
        animate={{ rotate: angle }}
        transition={reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 120, damping: 20 }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 100">
          <path d="M50 12 L56 50 L50 46 L44 50 Z" className={styles.needleTip} />
          <circle cx="50" cy="50" r="3.5" className={styles.needleHub} />
        </svg>
      </motion.div>
    </div>
  )
}
