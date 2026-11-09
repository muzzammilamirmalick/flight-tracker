import type { Replay, ReplaySpeed } from '../hooks/useReplay'
import { formatClockTime } from '../lib/describe'
import styles from './ReplayTimeline.module.css'

const SPEEDS: ReplaySpeed[] = [1, 10, 60]

interface ReplayTimelineProps {
  replay: Replay
  nowMs: number
}

// A timeline to play today's traffic back: play and pause, a slider for the time, and 1x, 10x or 60x speed.
export function ReplayTimeline({ replay, nowMs }: ReplayTimelineProps) {
  if (!replay.active) {
    return (
      <button type="button" className={styles.startButton} onClick={replay.start}>
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 7v5l3 2M21 12a9 9 0 1 1-3-6.7M21 4v4h-4" />
        </svg>
        Replay today
      </button>
    )
  }

  const timeText = formatClockTime(new Date(replay.timeMs))

  return (
    <section className={styles.panel} aria-label="Replay today">
      <div className={styles.topRow}>
        <button
          type="button"
          className={styles.playButton}
          onClick={replay.togglePlay}
          aria-label={replay.playing ? 'Pause replay' : 'Play replay'}
        >
          {replay.playing ? (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5h3v14H8zM13 5h3v14h-3z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M8 5l11 7-11 7z" />
            </svg>
          )}
        </button>

        <div className={styles.time}>
          <span className={styles.timeLabel}>Replaying</span>
          <span className={styles.timeValue}>{timeText}</span>
        </div>

        <div className={styles.speeds} role="group" aria-label="Replay speed">
          {SPEEDS.map((speed) => (
            <button
              key={speed}
              type="button"
              className={styles.speed}
              aria-pressed={replay.speed === speed}
              onClick={() => replay.setSpeed(speed)}
            >
              {speed}x
            </button>
          ))}
        </div>

        <button type="button" className={styles.liveButton} onClick={replay.stop}>
          Back to live
        </button>
      </div>

      <input
        type="range"
        className={styles.slider}
        min={replay.dayStartMs}
        max={nowMs}
        step={60_000}
        value={Math.min(replay.timeMs, nowMs)}
        onChange={(event) => replay.seek(Number(event.target.value))}
        aria-label="Replay time"
        aria-valuetext={timeText}
      />
      <div className={styles.ends} aria-hidden="true">
        <span>Midnight</span>
        <span>{replay.loading ? 'Loading...' : ''}</span>
        <span>Now</span>
      </div>
    </section>
  )
}
