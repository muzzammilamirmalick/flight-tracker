// Planes are colored by altitude: low is warm, high is cool.

export const ALTITUDE_STOPS: { feet: number; color: string }[] = [
  { feet: 0, color: '#ff8a5c' },
  { feet: 8000, color: '#ffc65c' },
  { feet: 18000, color: '#7fe0b4' },
  { feet: 28000, color: '#62b8ff' },
  { feet: 40000, color: '#a98bff' },
]

const UNKNOWN_ALTITUDE_COLOR = '#c4ccdc'

function hexToRgb(hex: string): [number, number, number] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function mix(from: string, to: string, amount: number): string {
  const a = hexToRgb(from)
  const b = hexToRgb(to)
  const channels = a.map((channel, i) => Math.round(channel + (b[i] - channel) * amount))
  return `rgb(${channels.join(', ')})`
}

export function altitudeColor(altitudeFt: number | null): string {
  if (altitudeFt === null) return UNKNOWN_ALTITUDE_COLOR

  const stops = ALTITUDE_STOPS
  if (altitudeFt <= stops[0].feet) return stops[0].color
  if (altitudeFt >= stops[stops.length - 1].feet) return stops[stops.length - 1].color

  for (let i = 1; i < stops.length; i++) {
    if (altitudeFt <= stops[i].feet) {
      const lower = stops[i - 1]
      const upper = stops[i]
      return mix(lower.color, upper.color, (altitudeFt - lower.feet) / (upper.feet - lower.feet))
    }
  }
  return UNKNOWN_ALTITUDE_COLOR
}

// CSS gradient for the legend, using the same stops.
export function altitudeGradientCss(): string {
  const max = ALTITUDE_STOPS[ALTITUDE_STOPS.length - 1].feet
  const parts = ALTITUDE_STOPS.map((stop) => `${stop.color} ${(stop.feet / max) * 100}%`)
  return `linear-gradient(90deg, ${parts.join(', ')})`
}
