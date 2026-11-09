import { useState } from 'react'
import { formatHour } from '../lib/describe'
import styles from './StatsStory.module.css'

interface HourlyRadialChartProps {
  planesPerHour: number[]
  busiestHour: number | null
  currentHour: number
}

const SIZE = 320
const CENTER = SIZE / 2
const INNER_RADIUS = 58
const MAX_BAR = 78
const BAR_WIDTH = 8
const LABEL_RADIUS = 152

// The day as a clock face: one bar per hour, midnight at the top, longer bars mean more planes.
export function HourlyRadialChart({ planesPerHour, busiestHour, currentHour }: HourlyRadialChartProps) {
  const [hovered, setHovered] = useState<number | null>(null)
  const most = Math.max(1, ...planesPerHour)

  const centerTitle = hovered === null ? 'Planes each hour' : formatHour(hovered)
  const centerValue =
    hovered === null ? '' : `${planesPerHour[hovered]} ${planesPerHour[hovered] === 1 ? 'plane' : 'planes'}`

  return (
    <div className={styles.radial}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className={styles.radialSvg} aria-hidden="true">
        <circle cx={CENTER} cy={CENTER} r={INNER_RADIUS} className={styles.radialBase} />

        {planesPerHour.map((planes, hour) => {
          const length = (planes / most) * MAX_BAR
          const angle = hour * 15 + 7.5
          const isBusiest = hour === busiestHour
          const isFuture = hour > currentHour

          return (
            <g
              key={hour}
              transform={`rotate(${angle} ${CENTER} ${CENTER})`}
              onMouseEnter={() => setHovered(hour)}
              onMouseLeave={() => setHovered(null)}
            >
              {/* A wide see-through bar, so the hover target is bigger than the thin bar. */}
              <rect
                x={CENTER - 9}
                y={CENTER - INNER_RADIUS - MAX_BAR - 4}
                width={18}
                height={MAX_BAR + 4}
                className={styles.radialHit}
              />
              {planes > 0 && (
                <rect
                  x={CENTER - BAR_WIDTH / 2}
                  y={CENTER - INNER_RADIUS - 2 - length}
                  width={BAR_WIDTH}
                  height={length}
                  rx={4}
                  className={`${styles.radialBar} ${isBusiest ? styles.radialBusiest : ''} ${
                    hovered === hour ? styles.radialHovered : ''
                  }`}
                />
              )}
              {planes === 0 && !isFuture && (
                <circle cx={CENTER} cy={CENTER - INNER_RADIUS - 4} r={1.5} className={styles.radialEmpty} />
              )}
            </g>
          )
        })}

        {[0, 6, 12, 18].map((hour) => {
          const radians = ((hour * 15 - 90) * Math.PI) / 180
          return (
            <text
              key={hour}
              x={CENTER + LABEL_RADIUS * Math.cos(radians)}
              y={CENTER + LABEL_RADIUS * Math.sin(radians)}
              className={styles.radialLabel}
            >
              {formatHour(hour)}
            </text>
          )
        })}

        <text x={CENTER} y={CENTER - 6} className={styles.radialCenterTitle}>
          {centerTitle}
        </text>
        <text x={CENTER} y={CENTER + 14} className={styles.radialCenterValue}>
          {centerValue}
        </text>
      </svg>

      {/* The same numbers as a table, for screen readers and anyone who prefers it. */}
      <details className={styles.tableToggle}>
        <summary>Show as a table</summary>
        <table className={styles.hourTable}>
          <thead>
            <tr>
              <th scope="col">Hour</th>
              <th scope="col">Planes</th>
            </tr>
          </thead>
          <tbody>
            {planesPerHour.map((planes, hour) =>
              hour > currentHour ? null : (
                <tr key={hour}>
                  <td>{formatHour(hour)}</td>
                  <td>{planes}</td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </details>
    </div>
  )
}
