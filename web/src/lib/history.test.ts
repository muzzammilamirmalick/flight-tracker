import { describe, expect, it } from 'vitest'
import { formatHistoryDate, HISTORY_FLIGHTS, pathBounds, recordingSrc, youTubeEmbedUrl } from './history'

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
          // Down to -360 is allowed, for a path that crosses the Pacific.
          expect(lon).toBeGreaterThanOrEqual(-360)
          expect(lon).toBeLessThanOrEqual(180)
          expect(Math.abs(lat)).toBeLessThanOrEqual(90)
        }
      })

      it('marks a dashed start that fits inside the path', () => {
        const split = flight.sketchedUntil ?? 0
        expect(split).toBeGreaterThanOrEqual(0)
        expect(split).toBeLessThanOrEqual(flight.path.length - 1)
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

      it('quotes ATC lines with a source, and only links recordings over https', () => {
        if (!flight.atc) return
        expect(flight.atc.source.length).toBeGreaterThan(0)
        expect(flight.atc.lines.length).toBeGreaterThan(0)
        if (flight.atc.recording) {
          expect(flight.atc.recording.url).toMatch(/^https:\/\//)
          expect(flight.atc.recording.pageUrl).toMatch(/^https:\/\//)
        }
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

  it('starts a recording at the key moment when a start time is given', () => {
    expect(recordingSrc({ url: 'https://example.org/a.mp3', startSeconds: 440 })).toBe('https://example.org/a.mp3#t=440')
    expect(recordingSrc({ url: 'https://example.org/a.mp3' })).toBe('https://example.org/a.mp3')
  })

  it('embeds from youtube-nocookie.com', () => {
    expect(youTubeEmbedUrl('Cv_48qFhoO4')).toBe('https://www.youtube-nocookie.com/embed/Cv_48qFhoO4?rel=0')
  })
})
