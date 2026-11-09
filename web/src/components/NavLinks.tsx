import type { Route } from '../hooks/useHashRoute'
import styles from './NavLinks.module.css'

// Switches between the live map and the "Today over Hamilton" story.
export function NavLinks({ route }: { route: Route }) {
  return (
    <nav className={styles.nav} aria-label="Pages">
      <a href="#/" className={styles.link} aria-current={route === 'live' ? 'page' : undefined}>
        Live map
      </a>
      <a href="#/today" className={styles.link} aria-current={route === 'today' ? 'page' : undefined}>
        Today over Hamilton
      </a>
    </nav>
  )
}
