import { describe, expect, it } from 'vitest'
import { formatHistoryDate, HISTORY_FLIGHTS, pathBounds, youTubeEmbedUrl } from './history'

describe('history flight data', () => {
  it('has at least one flight with a unique id each', () => {
    const ids = HISTORY_FLIGHTS.map((flight) => flight.id)
    expect(ids.length).toBeGreaterThan(0)
    expect(new Set(ids).size).toBe(ids.length)
  })

  for (const flight of HISTORY_FLIGHTS) {
    describe(flight.flightNumber, () => {
      it('has real looking coordinates in [longitude, latitude] order', () => {
        const points = [...flight.path, ...flight.keyPoints.map((point) => point.coordinates)]
        expect(flight.path.length).toBeGreaterThanOrEqual(2)
        for (const [lon, lat] of points) {
          expect(Math.abs(lon)).toBeLessThanOrEqual(180)
          expect(Math.abs(lat)).toBeLessThanOrEqual(90)
        }
      })

      it('starts with a departure and ends with a final position', () => {
        expect(flight.keyPoints[0].kind).toBe('departure')
        expect(flight.keyPoints.at(-1)?.kind).toBe('final')
      })

      it('cites sources over https and has a YouTube video id', () => {
        expect(flight.sources.length).toBeGreaterThanOrEqual(2)
        for (const source of flight.sources) {
          expect(source.url).toMatch(/^https:\/\//)
        }
        expect(flight.video.youtubeId).toMatch(/^[\w-]{11}$/)
      })

      it('has a valid date', () => {
        expect(Number.isNaN(new Date(flight.date).getTime())).toBe(false)
      })

      it('has no em dashes in any text', () => {
        expect(JSON.stringify(flight)).not.toContain(String.fromCharCode(0x2014))
      })
    })
  }
})

describe('history helpers', () => {
  it('formats a date without shifting the day', () => {
    expect(formatHistoryDate('2009-01-15')).toBe('15 January 2009')
  })

  it('finds the box around a path and its points', () => {
    const [southWest, northEast] = pathBounds(HISTORY_FLIGHTS[0])
    expect(southWest[0]).toBeLessThan(northEast[0])
    expect(southWest[1]).toBeLessThan(northEast[1])
  })

  it('embeds from youtube-nocookie.com', () => {
    expect(youTubeEmbedUrl('Cv_48qFhoO4')).toBe('https://www.youtube-nocookie.com/embed/Cv_48qFhoO4?rel=0')
  })
})
