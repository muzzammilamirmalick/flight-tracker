import { useState } from 'react'
import { HistoryMap } from '../components/HistoryMap'
import { NavLinks } from '../components/NavLinks'
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import {
  formatHistoryDate,
  HISTORY_FLIGHTS,
  youTubeEmbedUrl,
  youTubeWatchUrl,
  type HistoryFlight,
} from '../lib/history'
import styles from './HistoryPage.module.css'

// Room taken by the panel, so the path is framed in the open part of the map.
const PHONE_PADDING = { top: 70, bottom: 40, left: 40, right: 110 }
const DESKTOP_PADDING = { top: 90, bottom: 90, left: 560, right: 140 }

// Famous flights, told the way an accident report would: what happened, why, and what changed.
export function HistoryPage({ reducedMotion }: { reducedMotion: boolean }) {
  const isPhone = useMediaQuery(PHONE_QUERY)
  const [flightId, setFlightId] = useState(HISTORY_FLIGHTS[0].id)
  const [focusedPoint, setFocusedPoint] = useState<number | null>(null)
  const flight = HISTORY_FLIGHTS.find((f) => f.id === flightId) ?? HISTORY_FLIGHTS[0]

  const pickFlight = (id: string) => {
    setFlightId(id)
    setFocusedPoint(null)
  }

  return (
    <>
      <div className={styles.mapArea}>
        <HistoryMap
          flight={flight}
          focusedPoint={focusedPoint}
          reducedMotion={reducedMotion}
          padding={isPhone ? PHONE_PADDING : DESKTOP_PADDING}
        />
      </div>

      <div className={styles.topNav}>
        <NavLinks route="history" compact={isPhone} />
      </div>

      <main className={styles.panel}>
        <header className={styles.intro}>
          <h1 className={styles.heading}>Aviation history</h1>
          <p className={styles.lead}>
            Notable flights, what happened, and what aviation learned from them. Every fact comes from the
            accident report or the sources listed with it.
          </p>
        </header>

        <nav aria-label="Flights">
          <ul className={styles.flightList}>
            {HISTORY_FLIGHTS.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={styles.flightButton}
                  aria-current={f.id === flight.id ? 'true' : undefined}
                  onClick={() => pickFlight(f.id)}
                >
                  <span className={styles.flightNumber}>{f.flightNumber}</span>
                  <span className={styles.flightMeta}>
                    {formatHistoryDate(f.date)} · {f.aircraft}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>

        <FlightStory
          key={flight.id}
          flight={flight}
          focusedPoint={focusedPoint}
          onFocusPoint={setFocusedPoint}
        />
      </main>
    </>
  )
}

interface FlightStoryProps {
  flight: HistoryFlight
  focusedPoint: number | null
  onFocusPoint: (index: number | null) => void
}

function FlightStory({ flight, focusedPoint, onFocusPoint }: FlightStoryProps) {
  return (
    <article className={styles.story} aria-labelledby="flight-title">
      <h2 id="flight-title" className={styles.title}>
        {flight.flightNumber}
      </h2>
      <p className={styles.outcome}>{flight.outcome}</p>

      <dl className={styles.facts}>
        <div>
          <dt>Date</dt>
          <dd>{formatHistoryDate(flight.date)}</dd>
        </div>
        <div>
          <dt>Airline</dt>
          <dd>{flight.airline}</dd>
        </div>
        <div>
          <dt>Aircraft</dt>
          <dd>
            {flight.aircraft}, {flight.registration}
          </dd>
        </div>
        <div>
          <dt>Route</dt>
          <dd>{flight.route}</dd>
        </div>
      </dl>

      <section className={styles.section} aria-labelledby="timeline-heading">
        <div className={styles.sectionHeader}>
          <h3 id="timeline-heading">Timeline</h3>
          <button
            type="button"
            className={styles.textButton}
            onClick={() => onFocusPoint(null)}
            disabled={focusedPoint === null}
          >
            Show whole path
          </button>
        </div>
        <ol className={styles.timeline}>
          {flight.keyPoints.map((point, index) => (
            <li key={point.label} className={styles[point.kind]}>
              <button
                type="button"
                className={styles.pointButton}
                aria-pressed={focusedPoint === index}
                onClick={() => onFocusPoint(index)}
              >
                <span className={styles.pointNumber} aria-hidden="true">
                  {index + 1}
                </span>
                <span>
                  <span className={styles.pointLabel}>
                    {point.label}
                    {point.time && <span className={styles.pointTime}> {point.time}</span>}
                  </span>
                  <span className={styles.pointText}>{point.text}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
        <p className={styles.note}>
          {flight.pathNote} Times are {flight.timeZone}.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="what-heading">
        <h3 id="what-heading">What happened</h3>
        {flight.summary.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </section>

      <section className={styles.section} aria-labelledby="cause-heading">
        <h3 id="cause-heading">Cause</h3>
        <p>{flight.cause}</p>
        {flight.quote && (
          <figure className={styles.quote}>
            <blockquote>
              <p>"{flight.quote.text}"</p>
            </blockquote>
            <figcaption>
              {flight.quote.speaker}, {flight.quote.time}. Source: {flight.quote.source}.
            </figcaption>
          </figure>
        )}
      </section>

      <section className={styles.section} aria-labelledby="lessons-heading">
        <h3 id="lessons-heading">What changed</h3>
        <ul className={styles.lessons}>
          {flight.lessons.map((lesson) => (
            <li key={lesson}>{lesson}</li>
          ))}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="video-heading">
        <h3 id="video-heading">Watch</h3>
        <div className={styles.video}>
          <iframe
            src={youTubeEmbedUrl(flight.video.youtubeId)}
            title={`${flight.video.title} (${flight.video.channel}, YouTube)`}
            loading="lazy"
            allow="encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </div>
        <p className={styles.note}>
          <a href={youTubeWatchUrl(flight.video.youtubeId)} target="_blank" rel="noreferrer">
            {flight.video.title}
          </a>{' '}
          by {flight.video.channel}, on YouTube.
        </p>
      </section>

      <section className={styles.section} aria-labelledby="sources-heading">
        <h3 id="sources-heading">Sources</h3>
        <ul className={styles.sources}>
          {flight.sources.map((source) => (
            <li key={source.url}>
              <a href={source.url} target="_blank" rel="noreferrer">
                {source.name}
              </a>
            </li>
          ))}
        </ul>
      </section>
    </article>
  )
}
