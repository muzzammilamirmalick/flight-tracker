import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { AltitudeLegend } from '../components/AltitudeLegend'
import { DepartureBoard } from '../components/DepartureBoard'
import { LiveMap } from '../components/LiveMap'
import { LookUpCard } from '../components/LookUpCard'
import { NavLinks } from '../components/NavLinks'
import { PlaneDetailCard } from '../components/PlaneDetailCard'
import { ReceiverStatus } from '../components/ReceiverStatus'
import { StatusBanner } from '../components/StatusBanner'
import { useLivePlanes } from '../hooks/useLivePlanes'
import { useNow } from '../hooks/useNow'
import { useReceiverStatus } from '../hooks/useReceiverStatus'
import { TRAIL_MINUTES, useTrails } from '../hooks/useTrails'
import { closestPlane, skyPositionOf } from '../lib/lookUp'
import { buildLiveTrailLines, predictPosition } from '../lib/planeMotion'
import styles from './LivePage.module.css'

export function LivePage({ reducedMotion }: { reducedMotion: boolean }) {
  const { planes, status, lastPlaneSeenAt } = useLivePlanes()
  const receiver = useReceiverStatus()
  const trails = useTrails(true)
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null)

  // The plane the Look Up card is showing when nothing is picked. Kept so the card does not flicker.
  const [closestIcao, setClosestIcao] = useState<string | null>(null)

  // Planes keep moving between reports, so work out where to look once a second.
  const now = useNow(1000)
  const selectedPlane = planes.find((plane) => plane.icao24 === selectedIcao) ?? null
  const closest = useMemo(() => closestPlane(planes, now, closestIcao), [planes, now, closestIcao])
  const selectedSky = selectedPlane ? skyPositionOf(selectedPlane, now) : null
  const target = selectedSky ?? closest

  const newClosestIcao = closest?.plane.icao24 ?? null
  if (newClosestIcao !== closestIcao) {
    setClosestIcao(newClosestIcao)
  }

  const closeDetails = useCallback(() => setSelectedIcao(null), [])
  const getTrailLines = useCallback((nowMs: number) => buildLiveTrailLines(planes, trails, nowMs), [planes, trails])

  return (
    <>
      <LiveMap
        planes={planes}
        selectedIcao={selectedPlane?.icao24 ?? null}
        reducedMotion={reducedMotion}
        onSelectPlane={setSelectedIcao}
        positionAt={predictPosition}
        getTrailLines={getTrailLines}
        trailMaxAgeMs={TRAIL_MINUTES * 60_000}
      />

      <main className={styles.overlay}>
        <h1 className={styles.visuallyHidden}>My Sky: planes over my home in Hamilton</h1>
        <StatusBanner status={status} />
        <LookUpCard
          target={target}
          isSelected={selectedPlane !== null}
          status={status}
          lastPlaneSeenAt={lastPlaneSeenAt}
          reducedMotion={reducedMotion}
          onShowClosest={closeDetails}
        />
      </main>

      <div className={styles.topNav}>
        <NavLinks route="live" />
      </div>

      <aside className={styles.side} aria-label="Planes near my home">
        <ReceiverStatus status={receiver} />
        <DepartureBoard
          planes={planes}
          selectedIcao={selectedPlane?.icao24 ?? null}
          reducedMotion={reducedMotion}
          onSelectPlane={setSelectedIcao}
        />
      </aside>

      <AltitudeLegend />

      <AnimatePresence>
        {selectedSky && (
          <PlaneDetailCard
            key="detail"
            target={selectedSky}
            nowMs={now}
            reducedMotion={reducedMotion}
            onClose={closeDetails}
          />
        )}
      </AnimatePresence>
    </>
  )
}
