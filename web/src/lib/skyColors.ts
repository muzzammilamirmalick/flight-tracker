import type { SunPosition } from './sun'

// Sky colors for different sun heights: [top of the sky, middle, near the horizon].
// Between two stops the colors are blended.
type Palette = [string, string, string]

interface SkyStop {
  elevation: number
  morning: Palette
  evening: Palette
}

const STOPS: SkyStop[] = [
  { elevation: -18, morning: ['#03050d', '#060a18', '#0b1226'], evening: ['#03050d', '#060a18', '#0b1226'] },
  { elevation: -10, morning: ['#070c22', '#141d42', '#26305a'], evening: ['#070b20', '#151a3d', '#2a2550'] },
  { elevation: -4, morning: ['#16245a', '#4a4d86', '#b07a8e'], evening: ['#141c4a', '#5a3f78', '#d0706a'] },
  { elevation: 1, morning: ['#2c4c8c', '#c48aa0', '#ffc69a'], evening: ['#283a78', '#c0607a', '#ff9a58'] },
  { elevation: 8, morning: ['#3d72b8', '#90b8dd', '#f4dcb0'], evening: ['#3a6ab0', '#9ab0d0', '#f6c890'] },
  { elevation: 25, morning: ['#2c6ac2', '#64a4e2', '#bfe0f6'], evening: ['#2c6ac2', '#64a4e2', '#bfe0f6'] },
]

function hexToRgb(hex: string): number[] {
  const value = parseInt(hex.slice(1), 16)
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255]
}

function blend(a: string, b: string, amount: number): string {
  const from = hexToRgb(a)
  const to = hexToRgb(b)
  return `rgb(${from.map((channel, i) => Math.round(channel + (to[i] - channel) * amount)).join(', ')})`
}

export function skyPalette(sun: SunPosition): Palette {
  const pick = (stop: SkyStop) => (sun.isMorning ? stop.morning : stop.evening)

  if (sun.elevation <= STOPS[0].elevation) return pick(STOPS[0])
  const last = STOPS[STOPS.length - 1]
  if (sun.elevation >= last.elevation) return pick(last)

  for (let i = 1; i < STOPS.length; i++) {
    if (sun.elevation <= STOPS[i].elevation) {
      const lower = STOPS[i - 1]
      const upper = STOPS[i]
      const amount = (sun.elevation - lower.elevation) / (upper.elevation - lower.elevation)
      const [a, b] = [pick(lower), pick(upper)]
      return [blend(a[0], b[0], amount), blend(a[1], b[1], amount), blend(a[2], b[2], amount)]
    }
  }
  return pick(last)
}

// Stars fade in after sunset: none while the sun is above -4 degrees, all of them below -12.
export function starOpacity(sun: SunPosition): number {
  return Math.min(1, Math.max(0, (-4 - sun.elevation) / 8))
}
