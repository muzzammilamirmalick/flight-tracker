import type { LivePlane } from '../api/types'
import { angleDifference, bearingDeg, compassName } from './geo'

// Turns plane data into plain words for people who are not into aviation.

const numberFormat = new Intl.NumberFormat('en-CA')

export function formatAltitude(altitudeFt: number | null): string {
  return altitudeFt === null ? 'Unknown' : `${numberFormat.format(Math.round(altitudeFt / 25) * 25)} ft`
}

export function formatSpeed(speedKts: number | null): string {
  return speedKts === null ? 'Unknown' : `${numberFormat.format(Math.round(speedKts * 1.852))} km/h`
}

export function formatDistance(km: number): string {
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`
}

export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('en-CA', { hour: 'numeric', minute: '2-digit' })
}

// "Air Canada Express" from the route, or the registered owner if there is no route.
export function airlineName(plane: LivePlane): string | null {
  return plane.route?.airlineName ?? plane.operator
}

// "Boeing 737-8". adsbdb sometimes already puts the maker in the model name.
export function aircraftName(plane: LivePlane): string | null {
  const { manufacturer, model } = plane
  if (!model) return manufacturer
  if (!manufacturer || model.toLowerCase().startsWith(manufacturer.toLowerCase())) return model
  return `${manufacturer} ${model}`
}

// Route data is not always right (airlines reuse flight numbers), so we only trust the
// destination if the plane is actually pointing roughly towards it.
export function likelyDestination(plane: LivePlane): string | null {
  const destination = plane.route?.destination
  if (!destination?.city || destination.latitude === null || destination.longitude === null) return null
  if (plane.heading === null) return null

  const towardsDestination = bearingDeg(plane, {
    latitude: destination.latitude,
    longitude: destination.longitude,
  })
  return angleDifference(towardsDestination, plane.heading) <= 45 ? destination.city : null
}

// "Air Canada Express Bombardier CRJ 900 heading to Sydney."
export function describePlane(plane: LivePlane): string {
  const airline = airlineName(plane)
  const aircraft = aircraftName(plane)

  let subject: string
  if (airline && aircraft) subject = `${airline} ${aircraft}`
  else if (aircraft) subject = `${article(aircraft)} ${aircraft}`
  else if (airline) subject = `${article(airline)} ${airline} plane`
  else subject = plane.callsign ? `Flight ${plane.callsign}` : 'A plane'

  const destination = likelyDestination(plane)
  return destination ? `${subject} heading to ${destination}.` : `${subject}.`
}

// "A" or "An" for the start of a sentence. Good enough for airline and plane names.
function article(word: string): string {
  return /^[aeiou]/i.test(word) ? 'An' : 'A'
}

// "Look north-east, about 30 degrees up."
export function describeWhereToLook(bearing: number, elevation: number): string {
  const direction = compassName(bearing)
  if (elevation >= 75) return 'Look almost straight up.'
  if (elevation < 3) return `Look ${direction}, just above the horizon.`
  return `Look ${direction}, about ${Math.round(elevation)} degrees up.`
}
