import type { ReceiverStatus as ReceiverStatusData } from '../api/types'
import styles from './ReceiverStatus.module.css'

interface ReceiverStatusProps {
  status: ReceiverStatusData | null
  // How many planes are on the live map, so the chip and the map always agree.
  planeCount: number
}

// Whole numbers for a busy receiver, one decimal for a quiet one, so 0.3 does not show as 0.
function formatRate(perSecond: number): string {
  return perSecond.toLocaleString('en-CA', { maximumFractionDigits: perSecond < 10 ? 1 : 0 })
}

// A small chip that says where the data comes from, so people know this is my own hardware.
export function ReceiverStatus({ status, planeCount }: ReceiverStatusProps) {
  const fromAntenna = status?.source !== 'OpenSky'
  const online = status?.online ?? false

  let title: string
  if (!status) title = 'Connecting...'
  else if (!online) title = fromAntenna ? 'My antenna is offline' : 'OpenSky is offline'
  else title = fromAntenna ? 'Live from my antenna' : 'Live from OpenSky'

  const details: string[] = []
  if (online && status?.messagesPerSecond !== null && status?.messagesPerSecond !== undefined) {
    const rate = status.messagesPerSecond
    details.push(`${formatRate(rate)} ${rate === 1 ? 'message' : 'messages'} a second`)
  }
  if (online) {
    details.push(`${planeCount} ${planeCount === 1 ? 'plane' : 'planes'}`)
  }

  return (
    <div className={`${styles.chip} ${online ? styles.online : styles.offline}`}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.title}>{title}</span>
      {details.length > 0 && <span className={styles.details}>{details.join(', ')}</span>}
    </div>
  )
}
