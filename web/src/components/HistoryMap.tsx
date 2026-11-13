import { useEffect, useRef, useState } from 'react'
import { Map as MapLibreMap, type GeoJSONSource, type PaddingOptions } from 'maplibre-gl'
import type { FeatureCollection } from 'geojson'
import { MAP_STYLE_URL } from '../config'
import { pathBounds, type HistoryFlight } from '../lib/history'
import { muteBaseMap } from '../lib/mapLayers'
import '../lib/mapWorker'
import styles from './HistoryMap.module.css'

interface HistoryMapProps {
  flight: HistoryFlight
  // Index into flight.keyPoints, or null to show the whole path.
  focusedPoint: number | null
  reducedMotion: boolean
  padding: PaddingOptions
}

const POINT_COLORS = {
  departure: '#8fd3ff',
  event: '#ffd28a',
  final: '#e9eef8',
}

function pathData(flight: HistoryFlight): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: [{ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: flight.path } }],
  }
}

function pointData(flight: HistoryFlight, focusedPoint: number | null): FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: flight.keyPoints.map((point, index) => ({
      type: 'Feature',
      properties: {
        label: `${index + 1}  ${point.label}`,
        color: POINT_COLORS[point.kind],
        focused: index === focusedPoint,
      },
      geometry: { type: 'Point', coordinates: point.coordinates },
    })),
  }
}

function addHistoryLayers(map: MapLibreMap) {
  map.addSource('history-path', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })
  map.addSource('history-points', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } })

  map.addLayer({
    id: 'history-path-glow',
    type: 'line',
    source: 'history-path',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#8fd3ff', 'line-width': 8, 'line-opacity': 0.15, 'line-blur': 4 },
  })
  map.addLayer({
    id: 'history-path',
    type: 'line',
    source: 'history-path',
    layout: { 'line-join': 'round', 'line-cap': 'round' },
    paint: { 'line-color': '#8fd3ff', 'line-width': 2.5, 'line-opacity': 0.9 },
  })
  map.addLayer({
    id: 'history-points',
    type: 'circle',
    source: 'history-points',
    paint: {
      'circle-color': ['get', 'color'],
      'circle-radius': ['case', ['get', 'focused'], 8, 5.5],
      'circle-stroke-color': '#0b1020',
      'circle-stroke-width': 2,
    },
  })
  map.addLayer({
    id: 'history-labels',
    type: 'symbol',
    source: 'history-points',
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 12,
      'text-anchor': 'left',
      'text-offset': [0.9, 0],
      'text-allow-overlap': true,
      'text-max-width': 14,
    },
    paint: {
      'text-color': ['get', 'color'],
      'text-halo-color': '#0b1020',
      'text-halo-width': 1.6,
    },
  })
}

// A dark map with one flight's path and its numbered key points. The same points are listed
// as a timeline next to the map, so the map itself is not the only way to read them.
export function HistoryMap({ flight, focusedPoint, reducedMotion, padding }: HistoryMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<MapLibreMap | null>(null)
  const [styleReady, setStyleReady] = useState(false)
  const paddingRef = useRef(padding)
  const firstFlightRef = useRef(flight)

  useEffect(() => {
    paddingRef.current = padding
  }, [padding])

  useEffect(() => {
    const instance = new MapLibreMap({
      container: containerRef.current!,
      style: MAP_STYLE_URL,
      bounds: pathBounds(firstFlightRef.current),
      fitBoundsOptions: { padding: paddingRef.current },
      maxZoom: 14,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      attributionControl: { compact: true },
    })
    instance.touchZoomRotate.disableRotation()
    instance.keyboard.disableRotation()
    instance.setMissingStyleImageResolver((id) => {
      if (!instance.hasImage(id)) {
        instance.addImage(id, { width: 1, height: 1, data: new Uint8Array(4) })
      }
    })
    instance.once('style.load', () => {
      muteBaseMap(instance)
      addHistoryLayers(instance)
      setStyleReady(true)
    })
    setMap(instance)

    return () => {
      instance.remove()
      setMap(null)
      setStyleReady(false)
    }
  }, [])

  // Draw the picked flight.
  useEffect(() => {
    if (!map || !styleReady) return
    ;(map.getSource('history-path') as GeoJSONSource).setData(pathData(flight))
    ;(map.getSource('history-points') as GeoJSONSource).setData(pointData(flight, focusedPoint))
  }, [map, styleReady, flight, focusedPoint])

  // Frame the whole path, or zoom in on one key point.
  useEffect(() => {
    if (!map) return
    if (focusedPoint === null) {
      map.fitBounds(pathBounds(flight), { padding: paddingRef.current, animate: !reducedMotion, duration: 1200 })
    } else {
      const camera = {
        center: flight.keyPoints[focusedPoint].coordinates,
        zoom: Math.max(map.getZoom(), 12),
        padding: paddingRef.current,
      }
      if (reducedMotion) {
        map.jumpTo(camera)
      } else {
        map.flyTo({ ...camera, duration: 1000 })
      }
    }
  }, [map, flight, focusedPoint, reducedMotion])

  return (
    <div
      ref={containerRef}
      className={styles.map}
      role="region"
      aria-label={`Map of the flight path of ${flight.flightNumber}, with ${flight.keyPoints.length} numbered points. The points are listed in the timeline.`}
    />
  )
}
