import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence } from 'motion/react'
import { AltitudeLegend } from '../components/AltitudeLegend'
import { BottomSheet } from '../components/BottomSheet'
import { DepartureBoard } from '../components/DepartureBoard'
import { LiveMap } from '../components/LiveMap'
import { LookUpCard } from '../components/LookUpCard'
import { NavLinks } from '../components/NavLinks'
import { PlaneDetailCard } from '../components/PlaneDetailCard'
import { ReceiverStatus } from '../components/ReceiverStatus'
import { ReplayTimeline } from '../components/ReplayTimeline'
import { StatusBanner } from '../components/StatusBanner'
import { useLivePlanes } from '../hooks/useLivePlanes'
import { PHONE_QUERY, useMediaQuery } from '../hooks/useMediaQuery'
import { useNow } from '../hooks/useNow'
import { useReceiverStatus } from '../hooks/useReceiverStatus'
import { useReplay } from '../hooks/useReplay'
import { TRAIL_MINUTES, useTrails } from '../hooks/useTrails'
import { closestPlane, skyPositionOf } from '../lib/lookUp'
import { buildLiveTrailLines, predictPosition } from '../lib/planeMotion'
import styles from './LivePage.module.css'

const TRAIL_MS = TRAIL_MINUTES * 60_000

// Room taken by the cards, so the camera keeps a picked plane in the open part of the map.
const PHONE_PADDING = { top: 300, bottom: 200, left: 24, right: 24 }
const DESKTOP_PADDING = { top: 80, bottom: 160, left: 440, right: 440 }

export function LivePage({ reducedMotion }: { reducedMotion: boolean }) {
  const isPhone = useMediaQuery(PHONE_QUERY)
  const live = useLivePlanes()
  const receiver = useReceiverStatus()
  const replay = useReplay(TRAIL_MS)
  const trails = useTrails(!replay.active)
  const [selectedIcao, setSelectedIcao] = useState<string | null>(null)

  // The plane the Look Up card is showing when nothing is picked. Kept so the card does not flicker.
  const [closestIcao, setClosestIcao] = useState<string | null>(null)

  // While replaying, everything on the page shows the replay time instead of now.
  const now = useNow(1000)
  const planes = replay.active ? replay.planes : live.planes
  const viewTime = replay.active ? replay.timeMs : now

  const selectedPlane = planes.find((plane) => plane.icao24 === selectedIcao) ?? null
  const closest = useMemo(() => closestPlane(planes, viewTime, closestIcao), [planes, viewTime, closestIcao])
  const selectedSky = selectedPlane ? skyPositionOf(selectedPlane, viewTime) : null
  const target = selectedSky ?? closest

  const newClosestIcao = closest?.plane.icao24 ?? null
  if (newClosestIcao !== closestIcao) {
    setClosestIcao(newClosestIcao)
  }

  const closeDetails = useCallback(() => setSelectedIcao(null), [])
  const liveTrailLines = useCallback(
    (nowMs: number) => buildLiveTrailLines(live.planes, trails, nowMs),
    [live.planes, trails],
  )

  return (
    <>
      <LiveMap
        planes={planes}
        selectedIcao={selectedPlane?.icao24 ?? null}
        reducedMotion={reducedMotion}
        onSelectPlane={setSelectedIcao}
        positionAt={replay.active ? replay.positionAt : predictPosition}
        getTrailLines={replay.active ? replay.getTrailLines : liveTrailLines}
        trailMaxAgeMs={TRAIL_MS}
        cameraPadding={isPhone ? PHONE_PADDING : DESKTOP_PADDING}
        initialZoom={isPhone ? 8 : 9}
      />

      <main className={styles.overlay}>
        <h1 className={styles.visuallyHidden}>My Sky: planes over my home in Hamilton</h1>
        {!replay.active && <StatusBanner status={live.status} />}
        <LookUpCard
          target={target}
          isSelected={selectedPlane !== null}
          status={live.status}
          lastPlaneSeenAt={live.lastPlaneSeenAt}
          reducedMotion={reducedMotion}
          onShowClosest={closeDetails}
          replayTimeMs={replay.active ? replay.timeMs : null}
        />
      </main>

      {isPhone ? (
        // Phone: everything except the Look Up card lives in a sheet you can swipe up.
        <BottomSheet
          label="Antenna status, replay and nearest planes"
          reducedMotion={reducedMotion}
          peek={
            <>
              <ReceiverStatus status={receiver} planeCount={live.planes.length} />
              <div className={styles.peekRow}>
                <NavLinks route="live" compact />
                {!replay.active && <ReplayTimeline replay={replay} nowMs={now} />}
              </div>
              {replay.active && <ReplayTimeline replay={replay} nowMs={now} />}
            </>
          }
        >
          <DepartureBoard
          planes={planes}
          selectedIcao={selectedPlane?.icao24 ?? null}
          reducedMotion={reducedMotion}
          onSelectPlane={setSelectedIcao}
        />
          <AltitudeLegend inline />
        </BottomSheet>
      ) : (
        <>
          <div className={styles.topNav}>
            <NavLinks route="live" />
          </div>

          <aside className={styles.side} aria-label="Planes near my home">
            <ReceiverStatus status={receiver} planeCount={live.planes.length} />
            <DepartureBoard
              planes={planes}
              selectedIcao={selectedPlane?.icao24 ?? null}
              reducedMotion={reducedMotion}
              onSelectPlane={setSelectedIcao}
            />
          </aside>

          <div className={styles.timeline}>
            <ReplayTimeline replay={replay} nowMs={now} />
          </div>

          <AltitudeLegend />
        </>
      )}

      <AnimatePresence>
        {selectedSky && (
          <PlaneDetailCard
            key="detail"
            target={selectedSky}
            nowMs={viewTime}
            reducedMotion={reducedMotion}
            onClose={closeDetails}
          />
        )}
      </AnimatePresence>
    </>
  )
}
