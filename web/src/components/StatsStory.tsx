import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import type { RecordPlane } from '../api/types'
import { useCountUp } from '../hooks/useCountUp'
import { useNow } from '../hooks/useNow'
import { useTodayStats } from '../hooks/useTodayStats'
import { airlineFromCode } from '../lib/airlines'
import { formatAltitude, formatClockTime, formatHour, formatSpeed } from '../lib/describe'
import { AirlineBars } from './AirlineBars'
import { HourlyRadialChart } from './HourlyRadialChart'
import styles from './StatsStory.module.css'

interface StatsStoryProps {
  reducedMotion: boolean
}

function planeName(plane: RecordPlane): string {
  return plane.callsign ?? plane.icao24.toUpperCase()
}

function aircraftName(plane: RecordPlane): string | null {
  const { manufacturer, model } = plane
  if (!model) return manufacturer
  if (!manufacturer || model.toLowerCase().startsWith(manufacturer.toLowerCase())) return model
  return `${manufacturer} ${model}`
}

// ", a Boeing 737-8" or nothing if we do not know the type.
function aircraftPhrase(plane: RecordPlane): string {
  const name = aircraftName(plane)
  if (!name) return ''
  return `, ${/^[aeiou]/i.test(name) ? 'an' : 'a'} ${name}`
}

// "Today over Hamilton": the day's numbers told as a short story instead of a dashboard.
export function StatsStory({ reducedMotion }: StatsStoryProps) {
  const { stats, failed } = useTodayStats()
  const planesToday = useCountUp(stats?.planesToday ?? 0, reducedMotion)
  const busiestCount = useCountUp(stats?.busiestHour?.planes ?? 0, reducedMotion)

  const dateText = stats
    ? new Date(`${stats.date}T12:00:00`).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
    : ''
  const now = useNow(60_000)
  const currentHour = new Date(now).getHours()

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.heading}>Today over Hamilton</h1>
        {dateText && <p className={styles.date}>{dateText}</p>}
      </header>

      {!stats && !failed && <p className={styles.note}>Counting today's planes...</p>}
      {!stats && failed && <p className={styles.note}>Can't reach the flight tracker right now. Trying again in a minute.</p>}

      {stats && stats.planesToday === 0 && (
        <p className={styles.note}>No planes yet today. The first one will show up here.</p>
      )}

      {stats && stats.planesToday > 0 && (
        <>
          <Part reducedMotion={reducedMotion} label="Planes today">
            <p className={styles.lead}>So far today, my antenna has picked up</p>
            <p className={styles.bigNumber}>{planesToday}</p>
            <p className={styles.lead}>{stats.planesToday === 1 ? 'plane.' : 'different planes.'}</p>
          </Part>

          {stats.busiestHour && (
            <Part reducedMotion={reducedMotion} label="Busiest hour">
              <p className={styles.sentence}>
                The busiest hour was <strong>{formatHour(stats.busiestHour.hour)}</strong>, when{' '}
                <strong className={styles.mono}>{busiestCount}</strong> planes went over.
              </p>
              <HourlyRadialChart
                planesPerHour={stats.planesPerHour}
                busiestHour={stats.busiestHour.hour}
                currentHour={currentHour}
              />
            </Part>
          )}

          {stats.topAirlines.length > 0 && (
            <Part reducedMotion={reducedMotion} label="Top airlines">
              <p className={styles.sentence}>
                Most of them were{' '}
                <strong>{airlineFromCode(stats.topAirlines[0].code) ?? stats.topAirlines[0].code}</strong> flights.
              </p>
              <AirlineBars airlines={stats.topAirlines} />
            </Part>
          )}

          <Part reducedMotion={reducedMotion} label="Records">
            <p className={styles.sentence}>A few that stood out:</p>
            <div className={styles.records}>
              {stats.highest && (
                <RecordCard title="Highest" plane={stats.highest} value={formatAltitude(stats.highest.altitudeFt)} />
              )}
              {stats.fastest && (
                <RecordCard title="Fastest" plane={stats.fastest} value={formatSpeed(stats.fastest.speedKts)} />
              )}
              {stats.lowest && (
                <RecordCard title="Lowest" plane={stats.lowest} value={formatAltitude(stats.lowest.altitudeFt)} />
              )}
            </div>
          </Part>

          {stats.firstPlane && stats.latestPlane && (
            <Part reducedMotion={reducedMotion} label="First and latest plane">
              <p className={styles.sentence}>
                The first plane today was <strong className={styles.mono}>{planeName(stats.firstPlane)}</strong>
                {aircraftPhrase(stats.firstPlane)}, at {formatClockTime(new Date(stats.firstPlane.time))}. The latest
                is <strong className={styles.mono}>{planeName(stats.latestPlane)}</strong>
                {aircraftPhrase(stats.latestPlane)}, seen at {formatClockTime(new Date(stats.latestPlane.time))}.
              </p>
            </Part>
          )}
        </>
      )}
    </main>
  )
}

// Each part of the story fades up as you scroll to it.
function Part({ children, label, reducedMotion }: { children: ReactNode; label: string; reducedMotion: boolean }) {
  return (
    <motion.section
      className={styles.part}
      aria-label={label}
      initial={reducedMotion ? false : { opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.section>
  )
}

function RecordCard({ title, plane, value }: { title: string; plane: RecordPlane; value: string }) {
  const aircraft = aircraftName(plane)
  return (
    <article className={styles.record}>
      <h2 className={styles.recordTitle}>{title}</h2>
      <p className={styles.recordValue}>{value}</p>
      <p className={styles.recordPlane}>
        <span className={styles.mono}>{planeName(plane)}</span>
        {aircraft && <span>{aircraft}</span>}
        <span>at {formatClockTime(new Date(plane.time))}</span>
      </p>
    </article>
  )
}
