import { useEffect, useRef } from 'react'
import type { Feature } from 'geojson'
import type { GeoJSONSource, Map as MapLibreMap } from 'maplibre-gl'
import { altitudeColor } from '../lib/altitudeColor'
import type { TrailLinePoint } from '../lib/planeMotion'

interface PlaneTrailsProps {
  map: MapLibreMap
  // Returns one line per plane, oldest point first. Called a few times a second.
  getLines: (nowMs: number) => TrailLinePoint[][]
  maxAgeMs: number
}

const SOURCE_ID = 'plane-trails'
const REDRAW_MS = 500
const MAX_OPACITY = 0.7

// Draws a thin line behind each plane that fades out with age and takes the plane's altitude color.
// Each piece of the line is its own feature so it can have its own color and opacity.
export function PlaneTrails({ map, getLines, maxAgeMs }: PlaneTrailsProps) {
  const getLinesRef = useRef(getLines)

  useEffect(() => {
    getLinesRef.current = getLines
  }, [getLines])

  useEffect(() => {
    map.addSource(SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
    map.addLayer({
      id: SOURCE_ID,
      type: 'line',
      source: SOURCE_ID,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': ['get', 'color'],
        'line-opacity': ['get', 'opacity'],
        'line-width': 2,
      },
    })

    function redraw() {
      const now = Date.now()
      const features: Feature[] = []

      for (const line of getLinesRef.current(now)) {
        for (let i = 1; i < line.length; i++) {
          const from = line[i - 1]
          const to = line[i]
          const age = Math.min(1, (now - to.timeMs) / maxAgeMs)
          features.push({
            type: 'Feature',
            properties: {
              color: altitudeColor(to.altitudeFt),
              opacity: MAX_OPACITY * (1 - age) ** 1.5,
            },
            geometry: {
              type: 'LineString',
              coordinates: [
                [from.longitude, from.latitude],
                [to.longitude, to.latitude],
              ],
            },
          })
        }
      }

      const source = map.getSource<GeoJSONSource>(SOURCE_ID)
      source?.setData({ type: 'FeatureCollection', features })
    }

    redraw()
    const timer = window.setInterval(redraw, REDRAW_MS)

    return () => {
      window.clearInterval(timer)
      // The map may already be gone if the whole page is closing.
      if (map.getLayer(SOURCE_ID)) map.removeLayer(SOURCE_ID)
      if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
    }
  }, [map, maxAgeMs])

  return null
}
