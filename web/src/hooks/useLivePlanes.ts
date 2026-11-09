import { useEffect, useState } from 'react'
import { fetchLivePlanes } from '../api/client'
import type { LivePlane } from '../api/types'
import { POLL_INTERVAL_MS } from '../config'

export type LiveStatus = 'loading' | 'ok' | 'offline'

export interface LivePlanesState {
  planes: LivePlane[]
  status: LiveStatus
  // When this browser last saw at least one plane. Used for the empty state.
  lastPlaneSeenAt: Date | null
}

// Asks the API for live planes every few seconds.
// If a request fails we keep showing the last planes we had and mark the status offline.
export function useLivePlanes(): LivePlanesState {
  const [state, setState] = useState<LivePlanesState>({
    planes: [],
    status: 'loading',
    lastPlaneSeenAt: null,
  })

  useEffect(() => {
    let stopped = false
    let timer: number | undefined
    let controller: AbortController | undefined

    async function poll() {
      controller = new AbortController()
      try {
        const planes = await fetchLivePlanes(controller.signal)
        if (stopped) return
        setState((previous) => ({
          planes,
          status: 'ok',
          lastPlaneSeenAt: planes.length > 0 ? new Date() : previous.lastPlaneSeenAt,
        }))
      } catch {
        if (stopped) return
        setState((previous) => ({ ...previous, status: 'offline' }))
      }
      timer = window.setTimeout(poll, POLL_INTERVAL_MS)
    }

    poll()

    return () => {
      stopped = true
      controller?.abort()
      window.clearTimeout(timer)
    }
  }, [])

  return state
}
