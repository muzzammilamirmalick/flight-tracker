// Where the sun is in the sky, using the standard low-precision formulas
// (the same ones the SunCalc library uses). Accurate to well under a degree, plenty for picking sky colors.

const RAD = Math.PI / 180
const DAY_MS = 86_400_000
const J1970 = 2440588
const J2000 = 2451545
const EARTH_TILT = RAD * 23.4397

export interface SunPosition {
  // Degrees above the horizon. Negative when the sun has set.
  elevation: number
  // True before solar noon (the sun is in the eastern half of the sky).
  isMorning: boolean
}

function daysSinceJ2000(date: Date): number {
  return date.valueOf() / DAY_MS - 0.5 + J1970 - J2000
}

export function sunPosition(date: Date, latitude: number, longitude: number): SunPosition {
  const d = daysSinceJ2000(date)

  const meanAnomaly = RAD * (357.5291 + 0.98560028 * d)
  const center = RAD * (1.9148 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly) + 0.0003 * Math.sin(3 * meanAnomaly))
  const eclipticLongitude = meanAnomaly + center + RAD * 102.9372 + Math.PI

  const declination = Math.asin(Math.sin(EARTH_TILT) * Math.sin(eclipticLongitude))
  const rightAscension = Math.atan2(Math.sin(eclipticLongitude) * Math.cos(EARTH_TILT), Math.cos(eclipticLongitude))

  const siderealTime = RAD * (280.16 + 360.9856235 * d) + RAD * longitude
  const hourAngle = siderealTime - rightAscension
  const phi = RAD * latitude

  const elevation = Math.asin(
    Math.sin(phi) * Math.sin(declination) + Math.cos(phi) * Math.cos(declination) * Math.cos(hourAngle),
  )

  return {
    elevation: elevation / RAD,
    isMorning: Math.sin(hourAngle) < 0,
  }
}
