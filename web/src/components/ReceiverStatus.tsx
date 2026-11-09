import type { ReceiverStatus as ReceiverStatusData } from '../api/types'
import styles from './ReceiverStatus.module.css'

interface ReceiverStatusProps {
  status: ReceiverStatusData | null
}

const numberFormat = new Intl.NumberFormat('en-CA', { maximumFractionDigits: 0 })

// A small chip that says where the data comes from, so people know this is my own hardware.
export function ReceiverStatus({ status }: ReceiverStatusProps) {
  const fromAntenna = status?.source !== 'OpenSky'
  const online = status?.online ?? false

  let title: string
  if (!status) title = 'Connecting...'
  else if (!online) title = fromAntenna ? 'My antenna is offline' : 'OpenSky is offline'
  else title = fromAntenna ? 'Live from my antenna' : 'Live from OpenSky'

  const details: string[] = []
  if (online && status?.messagesPerSecond !== null && status?.messagesPerSecond !== undefined) {
    details.push(`${numberFormat.format(status.messagesPerSecond)} messages a second`)
  }
  if (online && status) {
    details.push(`${status.planesWithPosition} ${status.planesWithPosition === 1 ? 'plane' : 'planes'}`)
  }

  return (
    <div className={`${styles.chip} ${online ? styles.online : styles.offline}`}>
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.title}>{title}</span>
      {details.length > 0 && <span className={styles.details}>{details.join(', ')}</span>}
    </div>
  )
}
