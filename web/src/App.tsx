import { useReducedMotion } from 'motion/react'
import { NavLinks } from './components/NavLinks'
import { SkyBackground } from './components/SkyBackground'
import { StatsStory } from './components/StatsStory'
import { useHashRoute } from './hooks/useHashRoute'
import { LivePage } from './pages/LivePage'
import styles from './App.module.css'

export default function App() {
  const route = useHashRoute()
  const reducedMotion = useReducedMotion() ?? false

  return (
    <div className={styles.app}>
      <SkyBackground />
      {route === 'today' ? (
        <>
          <div className={styles.storyNav}>
            <NavLinks route="today" />
          </div>
          <StatsStory reducedMotion={reducedMotion} />
        </>
      ) : (
        <LivePage reducedMotion={reducedMotion} />
      )}
    </div>
  )
}
