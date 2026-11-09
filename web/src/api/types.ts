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
