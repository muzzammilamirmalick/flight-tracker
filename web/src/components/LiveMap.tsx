import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { AnimatePresence } from 'motion/react'
import type { LivePlane } from '../api/types'
import { HOME, MAP_STYLE_URL } from '../config'
import type { LatLon } from '../lib/geo'
import type { TrailLinePoint } from '../lib/planeMotion'
import { addRangeRings, muteBaseMap } from '../lib/mapLayers'
import '../lib/mapWorker'
import { PlaneMarker } from './PlaneMarker'
import { PlaneTrails } from './PlaneTrails'
import styles from './LiveMap.module.css'

interface LiveMapProps {
  planes: LivePlane[]
  selectedIcao: string | null
  reducedMotion: boolean
  onSelectPlane: (icao24: string) => void
  // Where each plane should be drawn at a moment in time (live guess, or replay).
  positionAt: (plane: LivePlane, nowMs: number) => LatLon
  getTrailLines: (nowMs: number) => TrailLinePoint[][]
  trailMaxAgeMs: number
}

export function LiveMap({
  planes,
  selectedIcao,
  reducedMotion,
  onSelectPlane,
  positionAt,
  getTrailLines,
  trailMaxAgeMs,
}: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [styleReady, setStyleReady] = useState(false)
  const planesRef = useRef(planes)
  const positionAtRef = useRef(positionAt)

  useEffect(() => {
    planesRef.current = planes
    positionAtRef.current = positionAt
  }, [planes, positionAt])

  // When a plane is picked (on the map or on the board), fly the camera to it.
  useEffect(() => {
    if (!map || !selectedIcao) return
    const plane = planesRef.current.find((p) => p.icao24 === selectedIcao)
    if (!plane) return

    const position = positionAtRef.current(plane, Date.now())
    const camera = { center: [position.longitude, position.latitude] as [number, number], zoom: Math.max(map.getZoom(), 10) }
    if (reducedMotion) {
      map.jumpTo(camera)
    } else {
      map.flyTo({ ...camera, duration: 1400 })
    }
  }, [map, selectedIcao, reducedMotion])

  // Create the map once.
  useEffect(() => {
    const instance = new MapLibreMap({
      container: containerRef.current!,
      style: MAP_STYLE_URL,
      center: [HOME.longitude, HOME.latitude],
      zoom: 9,
      minZoom: 6,
      maxZoom: 14,
      // North always stays up, so plane headings are easy to read.
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    })
    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()

    // The base style asks for a few icons it does not ship. Give it a blank one instead of a warning.
    instance.setMissingStyleImageResolver((id) => {
      if (!instance.hasImage(id)) {
        instance.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) })
      }
    })

    // Add our layers as soon as the style file is read ("style.load"). We do not wait for "load",
    // because that waits for every map tile. The planes are shown right away, they do not need tiles.
    instance.once('style.load', () => {
      muteBaseMap(instance)
      addRangeRings(instance)
      setStyleReady(true)
    })
    setMap(instance)

    const homeElement = document.createElement('div')
    homeElement.className = styles.home
    homeElement.setAttribute('role', 'img')
    homeElement.setAttribute('aria-label', 'My home')
    new Marker({ element: homeElement }).setLngLat([HOME.longitude, HOME.latitude]).addTo(instance)

    return () => {
      instance.remove()
      setMap(null)
      setStyleReady(false)
    }
  }, [])

  return (
    <div ref={containerRef} className={styles.map} role="region" aria-label="Map of planes near my home">
      {map && styleReady && <PlaneTrails map={map} getLines={getTrailLines} maxAgeMs={trailMaxAgeMs} />}
      {map && (
        <AnimatePresence>
          {planes.map((plane) => (
            <PlaneMarker
              key={plane.icao24}
              map={map}
              plane={plane}
              isSelected={plane.icao24 === selectedIcao}
              reducedMotion={reducedMotion}
              onSelect={onSelectPlane}
              positionAt={positionAt}
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
