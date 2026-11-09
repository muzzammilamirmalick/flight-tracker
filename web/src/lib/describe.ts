import type { LivePlane } from '../api/types'
import { airlineFromCallsign } from './airlines'
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

// 0 is "12 AM", 13 is "1 PM".
export function formatHour(hour: number): string {
  const suffix = hour < 12 ? 'AM' : 'PM'
  const twelveHour = hour % 12 === 0 ? 12 : hour % 12
  return `${twelveHour} ${suffix}`
}

// "6:48 PM". Written as AM/PM so a sentence can end with it without a double full stop ("p.m..").
export function formatClockTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

// The airline from the callsign (our own table), or the registered owner if the callsign is not a known
// airline. Null if we are not sure, so callers can show just the callsign.
export function airlineName(plane: LivePlane): string | null {
  return airlineFromCallsign(plane.callsign) ?? plane.operator
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

// The origin is only trusted if the plane is flying away from it.
export function likelyOrigin(plane: LivePlane): string | null {
  const origin = plane.route?.origin
  if (!origin?.city || origin.latitude === null || origin.longitude === null) return null
  if (plane.heading === null) return null

  const awayFromOrigin = bearingDeg({ latitude: origin.latitude, longitude: origin.longitude }, plane)
  return angleDifference(awayFromOrigin, plane.heading) <= 60 ? origin.city : null
}

// "Toronto to Sydney", "Heading to Sydney", or null when the route data does not fit what the plane is doing.
export function describeRoute(plane: LivePlane): string | null {
  const destination = likelyDestination(plane)
  if (!destination) return null
  const origin = likelyOrigin(plane)
  return origin ? `${origin} to ${destination}` : `Heading to ${destination}`
}

// "Climbing", "Descending" or "Level", with the rate in feet per minute.
export function describeVerticalRate(feetPerMinute: number | null): string {
  if (feetPerMinute === null) return 'Unknown'
  if (Math.abs(feetPerMinute) < 300) return 'Level'
  const rate = `${numberFormat.format(Math.round(Math.abs(feetPerMinute) / 50) * 50)} ft per minute`
  return feetPerMinute > 0 ? `Climbing, ${rate}` : `Descending, ${rate}`
}

export function formatKnots(speedKts: number | null): string {
  return speedKts === null ? '' : `${Math.round(speedKts)} knots`
}

export function formatHeading(heading: number | null): string {
  return heading === null ? 'Unknown' : `${capitalize(compassName(heading))} (${Math.round(heading)}°)`
}

export function formatSecondsAgo(seconds: number): string {
  if (seconds < 5) return 'Just now'
  if (seconds < 90) return `${Math.round(seconds)} seconds ago`
  return `${Math.round(seconds / 60)} minutes ago`
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
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
