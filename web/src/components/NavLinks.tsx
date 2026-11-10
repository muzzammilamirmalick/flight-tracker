import type { Route } from '../hooks/useHashRoute'
import styles from './NavLinks.module.css'

// Switches between the live map and the "Today over Hamilton" story.
// `compact` uses shorter labels for the phone layout.
export function NavLinks({ route, compact = false }: { route: Route; compact?: boolean }) {
  return (
    <nav className={styles.nav} aria-label="Pages">
      <a href="#/" className={styles.link} aria-current={route === 'live' ? 'page' : undefined}>
        Live map
      </a>
      <a href="#/today" className={styles.link} aria-current={route === 'today' ? 'page' : undefined}>
        {compact ? 'Today' : 'Today over Hamilton'}
      </a>
    </nav>
  )
}
