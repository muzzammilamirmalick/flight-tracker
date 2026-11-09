import { HOME } from '../config'
import { useNow } from '../hooks/useNow'
import { skyPalette, starOpacity } from '../lib/skyColors'
import { sunPosition } from '../lib/sun'
import styles from './SkyBackground.module.css'

const STAR_COUNT = 140

// Small random number generator with a fixed seed, so the stars stay in the same place every time.
function seededRandom(seed: number) {
  let value = seed
  return () => {
    value = (value * 16807) % 2147483647
    return value / 2147483647
  }
}

// Made once, so the stars stay put.
const STARS = makeStars()

function makeStars() {
  const random = seededRandom(42)
  return Array.from({ length: STAR_COUNT }, () => ({
    left: random() * 100,
    top: random() * 70,
    size: random() < 0.85 ? 1 : 2,
    delay: random() * 6,
  }))
}

// For screenshots and testing: ?skyTime=2026-06-21T20:30 shows the sky at that time.
function skyTimeOverride(): Date | null {
  const value = new URLSearchParams(window.location.search).get('skyTime')
  const date = value ? new Date(value) : null
  return date && !Number.isNaN(date.valueOf()) ? date : null
}

// The page background: the color of the real sky over Hamilton right now, with stars at night.
export function SkyBackground() {
  const now = useNow(60_000)

  const date = skyTimeOverride() ?? new Date(now)
  const sun = sunPosition(date, HOME.latitude, HOME.longitude)
  const [top, middle, horizon] = skyPalette(sun)

  return (
    <div
      className={styles.sky}
      style={{ background: `linear-gradient(to bottom, ${top} 0%, ${middle} 45%, ${horizon} 80%)` }}
      aria-hidden="true"
    >
      <div className={styles.stars} style={{ opacity: starOpacity(sun) }}>
        {STARS.map((star, i) => (
          <span
            key={i}
            className={styles.star}
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              animationDelay: `${star.delay}s`,
            }}
          />
        ))}
      </div>
    </div>
  )
}
