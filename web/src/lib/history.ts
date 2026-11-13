import flightData from '../data/historyFlights.json'

// One famous flight in the Aviation history section. The data lives in data/historyFlights.json,
// so adding a flight means adding one entry there. Coordinates are [longitude, latitude], like GeoJSON.

export type LonLat = [number, number]

export interface KeyPoint {
  kind: 'departure' | 'event' | 'final'
  label: string
  // Local time of day, if the report gives one.
  time?: string
  text: string
  coordinates: LonLat
}

export interface Source {
  name: string
  url: string
}

export interface HistoryFlight {
  id: string
  flightNumber: string
  date: string
  airline: string
  aircraft: string
  registration: string
  route: string
  outcome: string
  summary: string[]
  cause: string
  // One line from the record that explains the cause, with where it comes from.
  quote?: { text: string; speaker: string; time: string; source: string }
  lessons: string[]
  path: LonLat[]
  pathNote: string
  keyPoints: KeyPoint[]
  video: { youtubeId: string; title: string; channel: string }
  sources: Source[]
}

export const HISTORY_FLIGHTS = flightData as HistoryFlight[]

// "15 January 2009". Read as UTC so the day never shifts with the viewer's time zone.
export function formatHistoryDate(isoDate: string): string {
  return new Date(`${isoDate}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

// The box around a path and its markers, as [[west, south], [east, north]] for MapLibre's fitBounds.
export function pathBounds(flight: HistoryFlight): [LonLat, LonLat] {
  const points = [...flight.path, ...flight.keyPoints.map((point) => point.coordinates)]
  const lons = points.map(([lon]) => lon)
  const lats = points.map(([, lat]) => lat)
  return [
    [Math.min(...lons), Math.min(...lats)],
    [Math.max(...lons), Math.max(...lats)],
  ]
}

// youtube-nocookie.com does not set tracking cookies until the viewer presses play.
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0`
}

export function youTubeWatchUrl(id: string): string {
  return `https://www.youtube.com/watch?v=${id}`
}
