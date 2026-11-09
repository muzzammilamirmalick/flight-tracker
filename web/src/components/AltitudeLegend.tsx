import { altitudeGradientCss } from '../lib/altitudeColor'
import styles from './AltitudeLegend.module.css'

export function AltitudeLegend() {
  return (
    <div className={styles.legend} aria-label="Plane colors show altitude, from warm for low to cool for high">
      <span className={styles.title}>Altitude</span>
      <div className={styles.bar} style={{ background: altitudeGradientCss() }} />
      <div className={styles.ticks} aria-hidden="true">
        <span>0</span>
        <span>10k</span>
        <span>20k</span>
        <span>30k</span>
        <span>40k ft</span>
      </div>
    </div>
  )
}
