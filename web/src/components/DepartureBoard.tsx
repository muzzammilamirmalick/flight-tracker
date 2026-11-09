import { useMemo } from 'react'
import type { LivePlane } from '../api/types'
import { useThrottledValue } from '../hooks/useThrottledValue'
import { airlineName, formatAltitude, formatDistance } from '../lib/describe'
import { skyPositionOf } from '../lib/lookUp'
import { SplitFlapText } from './SplitFlap'
import styles from './DepartureBoard.module.css'

interface DepartureBoardProps {
  planes: LivePlane[]
  selectedIcao: string | null
  reducedMotion: boolean
  onSelectPlane: (icao24: string) => void
}

const ROWS = 6

const numberFormat = new Intl.NumberFormat('en-CA')

// Board columns are short, so numbers are rounded to keep them from flipping all the time.
function boardAltitude(altitudeFt: number | null): string {
  return altitudeFt === null ? '' : numberFormat.format(Math.round(altitudeFt / 100) * 100)
}

function boardDistance(km: number): string {
  return km < 10 ? km.toFixed(1) : String(Math.round(km))
}

// The 6 planes closest to home, on a split-flap board.
export function DepartureBoard({ planes, selectedIcao, reducedMotion, onSelectPlane }: DepartureBoardProps) {
  // During a fast replay the planes change several times a second. A flap needs about a third of a
  // second to turn, so the board takes at most one update every 1.5 seconds.
  const boardPlanes = useThrottledValue(planes, 1500)

  // Distances use each plane's last report (not the moving guess), so the board only changes
  // when new data arrives instead of flipping every second.
  const nearest = useMemo(
    () =>
      boardPlanes
        .map((plane) => skyPositionOf(plane, Date.parse(plane.lastSeen)))
        .sort((a, b) => a.distanceKm - b.distanceKm)
        .slice(0, ROWS),
    [boardPlanes],
  )

  return (
    <section className={styles.board} aria-labelledby="board-title">
      <h2 id="board-title" className={styles.title}>
        Nearest planes
      </h2>

      <div className={styles.table}>
        {/* Column labels are for sighted users. Each row button reads out everything in plain words. */}
        <div className={styles.headerRow} aria-hidden="true">
          <span>Flight</span>
          <span>Type</span>
          <span className={styles.right}>Altitude ft</span>
          <span className={styles.right}>Km</span>
        </div>

        <ol className={styles.rows} aria-label="The 6 planes closest to my home">
          {Array.from({ length: ROWS }, (_, i) => {
            const row = nearest[i]
            const plane = row?.plane
            const flight = plane ? (plane.callsign ?? plane.icao24) : ''

            const cells = (
              <>
                <SplitFlapText text={flight} length={7} reducedMotion={reducedMotion} />
                <SplitFlapText text={plane?.typeCode ?? ''} length={4} reducedMotion={reducedMotion} />
                <span className={styles.right}>
                  <SplitFlapText text={plane ? boardAltitude(plane.altitudeFt) : ''} length={6} align="right" reducedMotion={reducedMotion} />
                </span>
                <span className={styles.right}>
                  <SplitFlapText text={row ? boardDistance(row.distanceKm) : ''} length={4} align="right" reducedMotion={reducedMotion} />
                </span>
              </>
            )

            if (!plane) {
              return (
                <li key={i} className={`${styles.row} ${styles.empty}`} aria-hidden="true">
                  {cells}
                </li>
              )
            }

            const airline = airlineName(plane)
            const label = `${flight}${airline ? `, ${airline}` : ''}, altitude ${formatAltitude(plane.altitudeFt)}, ${formatDistance(row.distanceKm)} from home. Show details.`

            return (
              <li key={i} className={styles.rowItem}>
                <button
                  type="button"
                  className={`${styles.row} ${plane.icao24 === selectedIcao ? styles.selected : ''}`}
                  aria-label={label}
                  aria-pressed={plane.icao24 === selectedIcao}
                  onClick={() => onSelectPlane(plane.icao24)}
                >
                  {cells}
                </button>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
