import { useEffect, useState } from 'react'
import { fetchTrails } from '../api/client'
import type { Trail } from '../api/types'

export const TRAIL_MINUTES = 5
const REFRESH_MS = 10_000

// Recent positions of the live planes, refreshed every few seconds. Trails are a nice extra,
// so if the request fails we just keep the old ones.
export function useTrails(enabled: boolean): Trail[] {
  const [trails, setTrails] = useState<Trail[]>([])

  useEffect(() => {
    if (!enabled) return
    let stopped = false
    let timer: number | undefined
    const controller = new AbortController()

    async function load() {
      try {
        const result = await fetchTrails(TRAIL_MINUTES, controller.signal)
        if (!stopped) setTrails(result)
      } catch {
        // Keep the trails we already have.
      }
      if (!stopped) timer = window.setTimeout(load, REFRESH_MS)
    }

    load()
    return () => {
      stopped = true
      controller.abort()
      window.clearTimeout(timer)
    }
  }, [enabled])

  return trails
}
