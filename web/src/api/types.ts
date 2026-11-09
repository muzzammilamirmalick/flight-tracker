// Shapes of what the flight tracker API sends back. Times are UTC ISO strings.

export interface Airport {
  code: string | null
  name: string | null
  city: string | null
  latitude: number | null
  longitude: number | null
}

export interface FlightRoute {
  airlineName: string | null
  origin: Airport | null
  destination: Airport | null
}

export interface LivePlane {
  icao24: string
  callsign: string | null
  registration: string | null
  typeCode: string | null
  manufacturer: string | null
  model: string | null
  operator: string | null
  latitude: number
  longitude: number
  altitudeFt: number | null
  speedKts: number | null
  heading: number | null
  verticalRate: number | null
  lastSeen: string
  route: FlightRoute | null
}

export interface TrailPoint {
  time: string
  latitude: number
  longitude: number
  altitudeFt: number | null
}

export interface Trail {
  icao24: string
  points: TrailPoint[]
}

export interface ReceiverStatus {
  source: string
  online: boolean
  lastUpdate: string | null
  messagesPerSecond: number | null
  aircraftTracked: number | null
  planesWithPosition: number
}

export interface RecordPlane {
  icao24: string
  callsign: string | null
  manufacturer: string | null
  model: string | null
  altitudeFt: number | null
  speedKts: number | null
  time: string
}

export interface TodayStats {
  date: string
  planesToday: number
  busiestHour: { hour: number; planes: number } | null
  // Different planes seen in each local hour, index 0 is midnight to 1 AM.
  planesPerHour: number[]
  topAirlines: { code: string; planes: number }[]
  highest: RecordPlane | null
  lowest: RecordPlane | null
  fastest: RecordPlane | null
  firstPlane: RecordPlane | null
  latestPlane: RecordPlane | null
}

export interface ReplayPoint {
  icao24: string
  callsign: string | null
  typeCode: string | null
  time: string
  latitude: number
  longitude: number
  altitudeFt: number | null
  speedKts: number | null
  heading: number | null
}
