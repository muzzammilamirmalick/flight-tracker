import { AnimatePresence, motion } from 'motion/react'
import type { LiveStatus } from '../hooks/useLivePlanes'
import styles from './StatusBanner.module.css'

// Shows a clear message when the API cannot be reached. Hidden when everything is fine.
export function StatusBanner({ status }: { status: LiveStatus }) {
  return (
    <div role="status" aria-live="polite" className={styles.wrapper}>
      <AnimatePresence>
        {status === 'offline' && (
          <motion.div
            className={styles.banner}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
          >
            <span className={styles.dot} aria-hidden="true" />
            Can't reach the flight tracker right now. Trying again...
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
