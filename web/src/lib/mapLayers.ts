import type { Map as MapLibreMap } from 'maplibre-gl'
import { HOME } from '../config'
import { movePoint } from './geo'

export const RANGE_RINGS_KM = [10, 25, 50]

// The base map has a lot of detail we do not need. Hide points of interest and fade the roads.
export function muteBaseMap(map: MapLibreMap) {
  for (const layer of map.getStyle().layers ?? []) {
    const id = layer.id.toLowerCase()

    if (id.includes('poi') || id.includes('housenumber') || id.includes('building')) {
      map.setLayoutProperty(layer.id, 'visibility', 'none')
    } else if (layer.type === 'line' && (id.includes('road') || id.includes('highway') || id.includes('transportation'))) {
      map.setPaintProperty(layer.id, 'line-opacity', 0.35)
    }
  }
}

function ringCoordinates(radiusKm: number): [number, number][] {
  const points: [number, number][] = []
  for (let degrees = 0; degrees <= 360; degrees += 3) {
    const point = movePoint(HOME, degrees, radiusKm)
    points.push([point.longitude, point.latitude])
  }
  return points
}

// Light dashed circles around home with small "10 km" labels at the top of each.
export function addRangeRings(map: MapLibreMap) {
  map.addSource('range-rings', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: RANGE_RINGS_KM.map((km) => ({
        type: 'Feature',
        properties: {},
        geometry: { type: 'LineString', coordinates: ringCoordinates(km) },
      })),
    },
  })

  map.addSource('range-labels', {
    type: 'geojson',
    data: {
      type: 'FeatureCollection',
      features: RANGE_RINGS_KM.map((km) => {
        const top = movePoint(HOME, 0, km)
        return {
          type: 'Feature',
          properties: { label: `${km} km` },
          geometry: { type: 'Point', coordinates: [top.longitude, top.latitude] },
        }
      }),
    },
  })

  map.addLayer({
    id: 'range-rings',
    type: 'line',
    source: 'range-rings',
    paint: {
      'line-color': '#9db8ff',
      'line-opacity': 0.28,
      'line-width': 1,
      'line-dasharray': [2, 3],
    },
  })

  map.addLayer({
    id: 'range-labels',
    type: 'symbol',
    source: 'range-labels',
    layout: {
      'text-field': ['get', 'label'],
      'text-font': ['Noto Sans Regular'],
      'text-size': 11,
      'text-offset': [0, -0.8],
    },
    paint: {
      'text-color': '#9db8ff',
      'text-opacity': 0.6,
      'text-halo-color': '#0b1020',
      'text-halo-width': 1.5,
    },
  })
}
