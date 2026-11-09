import { airlineFromCode } from '../lib/airlines'
import styles from './StatsStory.module.css'

interface AirlineBarsProps {
  airlines: { code: string; planes: number }[]
}

// Top airlines today as simple bars. The name and count are text, the bar just shows size.
export function AirlineBars({ airlines }: AirlineBarsProps) {
  const most = Math.max(1, ...airlines.map((airline) => airline.planes))

  return (
    <ol className={styles.airlines}>
      {airlines.map((airline) => {
        const name = airlineFromCode(airline.code) ?? airline.code
        return (
          <li key={airline.code} className={styles.airline} title={`${name}: ${airline.planes} planes`}>
            <span className={styles.airlineName}>{name}</span>
            <span className={styles.airlineTrack} aria-hidden="true">
              <span className={styles.airlineBar} style={{ width: `${(airline.planes / most) * 100}%` }} />
            </span>
            <span className={styles.airlineCount}>
              {airline.planes}
              <span className={styles.visuallyHidden}> {airline.planes === 1 ? 'plane' : 'planes'}</span>
            </span>
          </li>
        )
      })}
    </ol>
  )
}
