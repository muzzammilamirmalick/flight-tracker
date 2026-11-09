import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, Marker } from 'maplibre-gl'
import { AnimatePresence } from 'motion/react'
import type { LivePlane } from '../api/types'
import { HOME, MAP_STYLE_URL } from '../config'
import { addRangeRings, muteBaseMap } from '../lib/mapLayers'
import '../lib/mapWorker'
import { PlaneMarker } from './PlaneMarker'
import styles from './LiveMap.module.css'

interface LiveMapProps {
  planes: LivePlane[]
  selectedIcao: string | null
  reducedMotion: boolean
  onSelectPlane: (icao24: string) => void
}

export function LiveMap({ planes, selectedIcao, reducedMotion, onSelectPlane }: LiveMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)

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
    }
  }, [])

  return (
    <div ref={containerRef} className={styles.map} role="region" aria-label="Map of planes near my home">
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
            />
          ))}
        </AnimatePresence>
      )}
    </div>
  )
}
